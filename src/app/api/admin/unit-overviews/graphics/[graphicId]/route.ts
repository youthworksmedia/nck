import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { resourceIconKeys, type ResourceIconKey } from "@/lib/resource-icon-paths";
import { saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUnitGraphicExtensionLabel } from "@/lib/unit-graphic-metadata";

type RouteContext = {
  params: Promise<{ graphicId: string }>;
};

const schema = z.object({
  title: z.string().trim().min(1),
  icon: z.string().trim().optional(),
  filePath: z.string().trim().optional(),
  fileName: z.string().trim().optional(),
  includeCopyright: z.coerce.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function isResourceIconKey(value: string): value is ResourceIconKey {
  return resourceIconKeys.includes(value as ResourceIconKey);
}

function isPdfFileName(fileName: string | null) {
  return fileName?.split("?")[0]?.toLowerCase().endsWith(".pdf") ?? false;
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    icon: formData.get("icon"),
    filePath: formData.get("filePath"),
    fileName: formData.get("fileName"),
    includeCopyright: formData.get("includeCopyright") === "true",
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter the unit file fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const file = formData.get("file");
  const saved = file instanceof File && file.size ? await saveUploadedResourceFile(file, "general") : null;
  const fileName = saved?.name ?? (payload.data.fileName || null);
  const icon = isResourceIconKey(payload.data.icon ?? "") ? payload.data.icon : "unit-logo";
  const { graphicId } = await context.params;
  const { error } = await adminSupabase
    .from("curriculum_unit_graphics")
    .update({
      title: payload.data.title,
      description: getUnitGraphicExtensionLabel(fileName),
      icon,
      file_path: saved?.path ?? (payload.data.filePath || null),
      file_name: fileName,
      include_copyright: isPdfFileName(fileName) && payload.data.includeCopyright,
      display_order: payload.data.displayOrder,
      published: payload.data.status === "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", graphicId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateTag("unit-overviews");
  revalidatePath("/resources");
  revalidatePath("/admin");

  return NextResponse.json({ message: "Unit file saved." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { graphicId } = await context.params;
  const { error } = await adminSupabase.from("curriculum_unit_graphics").delete().eq("id", graphicId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateTag("unit-overviews");
  revalidatePath("/resources");
  revalidatePath("/admin");

  return NextResponse.json({ message: "Unit file deleted." });
}
