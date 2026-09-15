import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  curriculumSectionStorageValues,
  curriculumYearStorageValues,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unitHeroGraphicTitle } from "@/lib/unit-overviews";

async function canViewHeroImage() {
  const [user, membership, isSuperAdmin] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserSuperAdmin()
  ]);

  return Boolean(user && (isSuperAdmin || ["active", "trialing"].includes(membership.subscriptionStatus)));
}

export async function GET(request: Request) {
  if (!(await canViewHeroImage())) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Image service is not ready." }, { status: 400 });
  }

  const params = new URL(request.url).searchParams;
  const yearCycle = normalizeCurriculumYear(params.get("year"));
  const term = normalizeCurriculumSection(params.get("term"));
  const { data: heroImages, error } = await adminSupabase
    .from("curriculum_unit_graphics")
    .select("file_path, file_name, published")
    .in("year_cycle", curriculumYearStorageValues(yearCycle))
    .in("term", curriculumSectionStorageValues(term))
    .eq("title", unitHeroGraphicTitle)
    .eq("published", true)
    .limit(1);
  const heroImage = heroImages?.[0];

  if (error || !heroImage?.file_path) {
    return NextResponse.json({ message: "Hero image not found." }, { status: 404 });
  }

  const storedFile = await downloadStoredResourceFile(heroImage.file_path, heroImage.file_name || "unit-hero-image");

  if (!storedFile) {
    return NextResponse.json({ message: "Could not open this hero image." }, { status: 404 });
  }

  return new Response(Buffer.from(storedFile.bytes), {
    headers: {
      "Content-Type": storedFile.contentType,
      "Cache-Control": "private, max-age=300"
    }
  });
}
