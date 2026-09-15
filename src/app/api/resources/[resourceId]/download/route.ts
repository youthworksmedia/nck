import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getLessonResourceAttachmentsByProgram, parseLessonResourcePayload } from "@/lib/lesson-resource-files";
import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";
import { getCurrentOrganizationMembership, getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LessonResourceProgramKey } from "@/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

const assetColumns = {
  music: { path: "music_file_path", name: "music_file_name" },
  worksheet: { path: "worksheet_file_path", name: "worksheet_file_name" },
  manual: { path: "manual_file_path", name: "manual_file_name" }
} as const;

export async function GET(request: Request, context: RouteContext) {
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset");
  const programParam = url.searchParams.get("program");
  const isPreview = url.searchParams.get("preview") === "1";
  const program: LessonResourceProgramKey = programParam === "preschool" ? "preschool" : "schoolAge";

  if (!asset) {
    return NextResponse.json({ message: "Choose a valid download asset." }, { status: 400 });
  }

  const [user, membership, organizationMembership, isSuperAdmin] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    getCurrentOrganizationMembership(),
    isCurrentUserSuperAdmin()
  ]);

  if (!user || (!isSuperAdmin && !["active", "trialing"].includes(membership.subscriptionStatus))) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Download service is not ready." }, { status: 400 });
  }

  const { resourceId } = await context.params;

  const { data: resource, error } = await adminSupabase
    .from("resources")
    .select(
      "id, lesson_number, file_url, music_file_path, music_file_name, worksheet_file_path, worksheet_file_name, manual_file_path, manual_file_name, published"
    )
    .eq("id", resourceId)
    .eq("published", true)
    .limit(1)
    .maybeSingle();

  if (error || !resource) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }

  let filePath: string | null = null;
  let fileName = `${asset}.bin`;
  let includeCopyright = false;

  if (asset in assetColumns) {
    const { path: pathColumn, name: nameColumn } = assetColumns[asset as keyof typeof assetColumns];
    filePath = resource[pathColumn as keyof typeof resource] as string | null;
    fileName = (resource[nameColumn as keyof typeof resource] as string | null) ?? fileName;
  } else {
    const payload = parseLessonResourcePayload(resource.file_url, resource);
    const attachment = getLessonResourceAttachmentsByProgram(payload, program, resource.lesson_number).find(
      (entry) => entry.id === asset
    );
    filePath = attachment?.filePath ?? null;
    fileName = attachment?.fileName ?? attachment?.name ?? fileName;
    includeCopyright = attachment?.type === "pdf" && attachment.includeCopyright === true;
  }

  if (!filePath) {
    return NextResponse.json({ message: "This file is not available yet." }, { status: 404 });
  }

  try {
    const storedFile = await downloadStoredResourceFile(filePath, fileName);

    if (!storedFile) {
      return NextResponse.json({ message: "Could not open this file." }, { status: 404 });
    }

    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    const isPreviewable = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension);

    if (isPreview && !isPreviewable) {
      return NextResponse.json({ message: "This file cannot be previewed." }, { status: 415 });
    }

    if (!isPreview && organizationMembership.membership?.organization_id) {
      await adminSupabase.from("resource_downloads").insert({
        resource_id: resource.id,
        organization_id: organizationMembership.membership.organization_id,
        user_id: user.id
      });
    }

    const responseBytes = await addLicensedFooterToPdf(storedFile.bytes, {
      contentType: storedFile.contentType,
      fileName,
      membership,
      enabled: includeCopyright
    });

    return new NextResponse(Buffer.from(responseBytes), {
      headers: {
        "Content-Type": storedFile.contentType,
        "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "Could not open this file." }, { status: 404 });
  }
}
