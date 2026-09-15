import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { downloadStoredResourceFile, getDisplayFileName } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";

type RouteContext = {
  params: Promise<{ term: string }>;
};

function getMemoryUrl(termResource: Record<string, unknown>, slot: number) {
  const storedMemoryText = typeof termResource.memory_text === "string" ? termResource.memory_text : "";

  try {
    const parsed = JSON.parse(storedMemoryText) as unknown;
    if (parsed && typeof parsed === "object" && "items" in parsed && Array.isArray(parsed.items)) {
      const item = parsed.items[slot - 1] as { url?: unknown } | undefined;
      return typeof item?.url === "string" ? item.url : "";
    }
  } catch {
    // Existing rows may store a single plain-text verse rather than JSON.
  }

  if (slot === 2 && typeof termResource.memory_url_2 === "string") {
    return termResource.memory_url_2;
  }

  return typeof termResource.memory_url === "string" ? termResource.memory_url : "";
}

function getFileUrl(termResource: Record<string, unknown>, type: string, slot: number) {
  if (type === "reading-guide") {
    return typeof termResource.reading_guide_url === "string" ? termResource.reading_guide_url : "";
  }

  if (type === "parent-devotion") {
    return typeof termResource.parent_devotion_url === "string" ? termResource.parent_devotion_url : "";
  }

  return getMemoryUrl(termResource, slot);
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
  const access = await getAccess();

  if (!access.canDownload) {
    return NextResponse.json({ message: "Active account access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Resource files are not ready." }, { status: 400 });
  }

  const parsedTerm = Number((await context.params).term);
  const term = [1, 2, 3, 4, 5, 6].includes(parsedTerm) ? parsedTerm : 1;
  const url = new URL(request.url);
  const slot = url.searchParams.get("slot") === "2" ? 2 : 1;
  const type = url.searchParams.get("type") ?? "memory";
  const { data: termResource, error } = await adminSupabase
    .from("family_resource_terms")
    .select("*")
    .eq("term", term)
    .maybeSingle();

  if (error || !termResource?.published) {
    return NextResponse.json({ message: "Resource file not found." }, { status: 404 });
  }

  const filePath = getFileUrl(termResource as Record<string, unknown>, type, slot);
  const storedFile = await downloadStoredResourceFile(filePath, getDisplayFileName(filePath));

  if (!storedFile) {
    return NextResponse.json({ message: "Could not open this file." }, { status: 404 });
  }

  const fileName = getDisplayFileName(filePath) || `unit-${term}-${type === "memory" ? `memory-card-${slot}` : type}.bin`;

  const responseBytes = await addLicensedFooterToPdf(storedFile.bytes, {
    contentType: storedFile.contentType,
    fileName,
    membership: access.membership
  });

  return new Response(Buffer.from(responseBytes), {
    headers: {
      "Content-Type": storedFile.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=60"
    }
  });
}
