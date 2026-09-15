import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { curriculumSections, curriculumYears, normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { resourceIconKeys, type ResourceIconKey } from "@/lib/resource-icon-paths";
import { saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUnitGraphicExtensionLabel } from "@/lib/unit-graphic-metadata";

const schema = z.object({
  yearCycle: z.preprocess((value) => normalizeCurriculumYear(String(value ?? "")), z.enum(curriculumYears)),
  term: z.preprocess((value) => normalizeCurriculumSection(String(value ?? "")), z.enum(curriculumSections)),
  title: z.string().trim().min(1),
  icon: z.string().trim().optional(),
  includeCopyright: z.coerce.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).default(0)
});

function isResourceIconKey(value: string): value is ResourceIconKey {
  return resourceIconKeys.includes(value as ResourceIconKey);
}

function isPdfFileName(fileName: string) {
  return fileName.split("?")[0]?.toLowerCase().endsWith(".pdf") ?? false;
}

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    yearCycle: formData.get("yearCycle"),
    term: formData.get("term"),
    title: formData.get("title"),
    icon: formData.get("icon"),
    includeCopyright: formData.get("includeCopyright") === "true",
    displayOrder: formData.get("displayOrder")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter the unit file fields correctly." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ message: "Upload a unit file." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const saved = await saveUploadedResourceFile(file, "general");
  const icon = isResourceIconKey(payload.data.icon ?? "") ? payload.data.icon : "unit-logo";
  const { error } = await adminSupabase.from("curriculum_unit_graphics").insert({
    year_cycle: payload.data.yearCycle,
    term: payload.data.term,
    title: payload.data.title,
    description: getUnitGraphicExtensionLabel(saved.name),
    icon,
    file_path: saved.path,
    file_name: saved.name,
    include_copyright: isPdfFileName(saved.name) && payload.data.includeCopyright,
    display_order: payload.data.displayOrder,
    published: true
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateTag("unit-overviews");
  revalidatePath("/resources");
  revalidatePath("/admin");

  return NextResponse.json({ message: "Unit file added." });
}
