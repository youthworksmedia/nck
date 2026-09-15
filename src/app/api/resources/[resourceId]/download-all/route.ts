import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getLessonResourceAttachmentsByProgram, parseLessonResourcePayload } from "@/lib/lesson-resource-files";
import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";
import { createZip, sanitizeZipName } from "@/lib/simple-zip";
import { getCurrentOrganizationMembership, getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LessonResourceProgramKey } from "@/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

function getProgramLabel(program: LessonResourceProgramKey) {
  return program === "preschool" ? "preschool" : "school-age";
}

export async function GET(request: Request, context: RouteContext) {
  const programParam = new URL(request.url).searchParams.get("program");
  const program: LessonResourceProgramKey = programParam === "preschool" ? "preschool" : "schoolAge";
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
    .select("id, title, lesson_number, file_url, music_file_path, music_file_name, worksheet_file_path, worksheet_file_name, manual_file_path, manual_file_name, published")
    .eq("id", resourceId)
    .eq("published", true)
    .limit(1)
    .maybeSingle();

  if (error || !resource) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }

  const payload = parseLessonResourcePayload(resource.file_url, resource);
  const attachments = getLessonResourceAttachmentsByProgram(payload, program, resource.lesson_number);
  const files = (
    await Promise.all(
      attachments.map(async (attachment) => {
        const storedFile = await downloadStoredResourceFile(attachment.filePath, attachment.fileName);

        if (!storedFile) {
          return null;
        }

        const name = attachment.fileName || attachment.name || "resource.bin";
        const bytes = await addLicensedFooterToPdf(storedFile.bytes, {
          contentType: storedFile.contentType,
          fileName: name,
          membership,
          enabled: attachment.type === "pdf" && attachment.includeCopyright === true
        });

        return { name, bytes };
      })
    )
  ).filter((file): file is { name: string; bytes: Uint8Array } => file !== null);

  if (!files.length) {
    return NextResponse.json({ message: "No files are available for this lesson." }, { status: 404 });
  }

  if (organizationMembership.membership?.organization_id) {
    await adminSupabase.from("resource_downloads").insert({
      resource_id: resource.id,
      organization_id: organizationMembership.membership.organization_id,
      user_id: user.id
    });
  }

  const zipName = `${sanitizeZipName(resource.title || "lesson-files")}-${getProgramLabel(program)}.zip`;

  return new NextResponse(createZip(files), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
