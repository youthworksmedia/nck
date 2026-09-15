import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { curriculumSections, curriculumYears, normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { removeStoredResourceFile, saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unitHeroGraphicTitle } from "@/lib/unit-overviews";

const schema = z.object({
  yearCycle: z.preprocess((value) => normalizeCurriculumYear(String(value ?? "")), z.enum(curriculumYears)),
  term: z.preprocess((value) => normalizeCurriculumSection(String(value ?? "")), z.enum(curriculumSections)),
  eyebrow: z.string().trim().optional(),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().optional(),
  overviewHtml: z.string(),
  introVideoTitle: z.string().trim().optional(),
  introVideoMeta: z.string().trim().optional(),
  introVideoDescription: z.string().trim().optional(),
  introVideoUrl: z.string().trim().optional(),
  deepDiveVideoTitle: z.string().trim().optional(),
  deepDiveVideoMeta: z.string().trim().optional(),
  deepDiveVideoDescription: z.string().trim().optional(),
  deepDiveVideoUrl: z.string().trim().optional(),
  status: z.enum(["open", "closed"]).default("open"),
  removeHeroImage: z.preprocess((value) => value === "true" || value === true, z.boolean()).default(false)
});

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const formData = contentType.includes("multipart/form-data") ? await request.formData() : null;
  const body = formData ? Object.fromEntries(formData.entries()) : await request.json();
  const payload = schema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json({ message: "Enter the unit overview fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const heroImage = formData?.get("heroImage");
  const hasHeroImageUpload = heroImage instanceof File && heroImage.size > 0;

  if (hasHeroImageUpload && !heroImage.type.startsWith("image/")) {
    return NextResponse.json({ message: "Upload an image file for the hero background." }, { status: 400 });
  }

  const { data: existingHeroRows } = await adminSupabase
    .from("curriculum_unit_graphics")
    .select("id, file_path")
    .eq("year_cycle", payload.data.yearCycle)
    .eq("term", payload.data.term)
    .eq("title", unitHeroGraphicTitle)
    .limit(1);
  const existingHero = existingHeroRows?.[0];

  const savedHeroImage = hasHeroImageUpload ? await saveUploadedResourceFile(heroImage, "general") : null;
  const shouldRemoveHeroImage = payload.data.removeHeroImage || Boolean(savedHeroImage);
  const { error } = await adminSupabase.from("curriculum_unit_overviews").upsert(
    {
      year_cycle: payload.data.yearCycle,
      term: payload.data.term,
      eyebrow: payload.data.eyebrow ?? "",
      title: payload.data.title,
      subtitle: payload.data.subtitle ?? "",
      overview_html: payload.data.overviewHtml,
      intro_video_title: payload.data.introVideoTitle ?? "",
      intro_video_meta: payload.data.introVideoMeta ?? "",
      intro_video_description: payload.data.introVideoDescription ?? "",
      intro_video_url: payload.data.introVideoUrl || null,
      deep_dive_video_title: payload.data.deepDiveVideoTitle ?? "",
      deep_dive_video_meta: payload.data.deepDiveVideoMeta ?? "",
      deep_dive_video_description: payload.data.deepDiveVideoDescription ?? "",
      deep_dive_video_url: payload.data.deepDiveVideoUrl || null,
      published: payload.data.status === "open",
      updated_at: new Date().toISOString()
    },
    { onConflict: "year_cycle,term" }
  );

  if (error) {
    if (savedHeroImage) {
      await removeStoredResourceFile(savedHeroImage.path);
    }

    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (savedHeroImage) {
    const heroPayload = {
      year_cycle: payload.data.yearCycle,
      term: payload.data.term,
      title: unitHeroGraphicTitle,
      description: "Hero background image",
      icon: "🖼️",
      file_path: savedHeroImage.path,
      file_name: savedHeroImage.name,
      display_order: -1000,
      published: true,
      updated_at: new Date().toISOString()
    };
    const heroResult = existingHero?.id
      ? await adminSupabase.from("curriculum_unit_graphics").update(heroPayload).eq("id", existingHero.id)
      : await adminSupabase.from("curriculum_unit_graphics").insert(heroPayload);

    if (heroResult.error) {
      await removeStoredResourceFile(savedHeroImage.path);
      return NextResponse.json({ message: heroResult.error.message }, { status: 400 });
    }
  } else if (payload.data.removeHeroImage && existingHero?.id) {
    const { error: deleteError } = await adminSupabase.from("curriculum_unit_graphics").delete().eq("id", existingHero.id);

    if (deleteError) {
      return NextResponse.json({ message: deleteError.message }, { status: 400 });
    }
  }

  if (shouldRemoveHeroImage && typeof existingHero?.file_path === "string") {
    await removeStoredResourceFile(existingHero.file_path);
  }

  revalidateTag("unit-overviews");
  revalidatePath("/resources");
  revalidatePath("/admin");

  return NextResponse.json({ message: "Unit overview saved." });
}
