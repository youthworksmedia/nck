import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { downloadStoredResourceFile, getDisplayFileName } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

const fileColumns = {
  discussion: "discussion_url",
  activity: "activity_url",
  memory: "memory_url"
} as const;

function getType(value: string | null) {
  return value === "activity" || value === "memory" ? value : "discussion";
}

async function getAccess() {
  const [user, membership, isSuperAdmin] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserSuperAdmin()
  ]);

  return {
    canDownload: Boolean(user && (isSuperAdmin || ["active", "trialing"].includes(membership.subscriptionStatus))),
    membership
  };
}

export async function GET(request: Request, context: RouteContext) {
  const url = new URL(request.url);
  const isPreview = url.searchParams.get("preview") === "1";
  const access = await getAccess();

  if (!access.canDownload) {
    return NextResponse.json({ message: "Active account access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Resource files are not ready." }, { status: 400 });
  }

  const { lessonId } = await context.params;
  const type = getType(url.searchParams.get("type"));
  const column = fileColumns[type];
  const { data: lesson, error } = await adminSupabase
    .from("family_resource_lessons")
    .select("title, discussion_url, activity_url, memory_url, published")
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !lesson?.published) {
    return NextResponse.json({ message: "Resource file not found." }, { status: 404 });
  }

  const row = lesson as Record<string, unknown>;
  const filePath = typeof row[column] === "string" ? row[column] : "";
  const storedFile = await downloadStoredResourceFile(filePath, getDisplayFileName(filePath));

  if (!storedFile) {
    return NextResponse.json({ message: "Could not open this file." }, { status: 404 });
  }

  const fileName = getDisplayFileName(filePath) || `${lesson.title}-${type}.bin`;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const isPreviewable = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension);

  if (isPreview && !isPreviewable) {
    return NextResponse.json({ message: "This file cannot be previewed." }, { status: 415 });
  }

  const responseBytes = await addLicensedFooterToPdf(storedFile.bytes, {
    contentType: storedFile.contentType,
    fileName,
    membership: access.membership
  });

  return new Response(Buffer.from(responseBytes), {
    headers: {
      "Content-Type": storedFile.contentType,
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=60"
    }
  });
}
