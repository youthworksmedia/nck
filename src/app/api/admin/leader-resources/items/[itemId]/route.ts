import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { normalizeLeaderResourceType } from "@/lib/leader-resources";
import { saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

const schema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  eyebrow: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  resourceType: z.string().transform((value) => normalizeLeaderResourceType(value)),
  url: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateLeaderPages() {
  revalidatePath("/admin");
  revalidatePath("/leaders");
  revalidatePath("/leaders/games");
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eyebrow: formData.get("eyebrow"),
    duration: formData.get("duration"),
    resourceType: formData.get("resourceType"),
    url: formData.get("url"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter all leader resource fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { itemId } = await context.params;
  const uploadedFile = formData.get("file");
  const saved =
    uploadedFile instanceof File && uploadedFile.size
      ? await saveUploadedResourceFile(uploadedFile, "general")
      : null;
  const fileUrl = saved
    ? `/api/leaders/resources/download-file?path=${encodeURIComponent(saved.path)}&name=${encodeURIComponent(saved.name)}`
    : null;
  const updatePayload: Record<string, unknown> = {
    title: payload.data.title,
    description: payload.data.description ?? "",
    eyebrow: payload.data.eyebrow ?? "",
    duration: payload.data.duration || null,
    resource_type: payload.data.resourceType,
    url: fileUrl || payload.data.url || null,
    display_order: payload.data.displayOrder,
    published: payload.data.status === "open",
    updated_at: new Date().toISOString()
  };

  const { error } = await adminSupabase
    .from("leader_resource_items")
    .update(updatePayload)
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateLeaderPages();

  return NextResponse.json({ message: "Resource saved." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { itemId } = await context.params;
  const { error } = await adminSupabase.from("leader_resource_items").delete().eq("id", itemId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateLeaderPages();

  return NextResponse.json({ message: "Resource deleted." });
}
