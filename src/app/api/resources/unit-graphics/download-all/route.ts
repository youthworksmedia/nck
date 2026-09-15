import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  curriculumSectionStorageValues,
  curriculumYearStorageValues,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";
import { createZip, sanitizeZipName } from "@/lib/simple-zip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { unitHeroGraphicTitle } from "@/lib/unit-overviews";

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

export async function GET(request: Request) {
  const access = await getAccess();

  if (!access.canDownload) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Download service is not ready." }, { status: 400 });
  }

  const params = new URL(request.url).searchParams;
  const yearCycle = normalizeCurriculumYear(params.get("year"));
  const term = normalizeCurriculumSection(params.get("term"));
  const { data: graphics, error } = await adminSupabase
    .from("curriculum_unit_graphics")
    .select("*")
    .in("year_cycle", curriculumYearStorageValues(yearCycle))
    .in("term", curriculumSectionStorageValues(term))
    .eq("published", true)
    .neq("title", unitHeroGraphicTitle)
    .order("display_order", { ascending: true });

  if (error || !graphics?.length) {
    return NextResponse.json({ message: "No graphics found." }, { status: 404 });
  }

  const files = (
    await Promise.all(
      graphics.map(async (graphic) => {
        if (!graphic.file_path) {
          return null;
        }

        const storedFile = await downloadStoredResourceFile(graphic.file_path, graphic.file_name || graphic.title);

        if (!storedFile) {
          return null;
        }

        const name = graphic.file_name || graphic.title || "graphic.bin";
        const bytes = await addLicensedFooterToPdf(storedFile.bytes, {
          contentType: storedFile.contentType,
          fileName: name,
          membership: access.membership,
          enabled: graphic.include_copyright === true
        });

        return { name, bytes };
      })
    )
  ).filter((file): file is { name: string; bytes: Uint8Array } => file !== null);

  if (!files.length) {
    return NextResponse.json({ message: "No graphics found." }, { status: 404 });
  }

  return new Response(createZip(files), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(sanitizeZipName(`${yearCycle}-${term}-graphics.zip`))}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
