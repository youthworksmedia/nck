import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { normalizeMinistryLeaderResourceType } from "@/lib/ministry-leader-resources";
import { removeStoredResourceFile, saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

const schema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  resourceType: z.string().transform((value) => normalizeMinistryLeaderResourceType(value)),
  actionLabel: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  url: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateResourcePages() {
  revalidatePath("/admin");
  revalidatePath("/account/resources");
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
    resourceType: formData.get("resourceType"),
    actionLabel: formData.get("actionLabel"),
    duration: formData.get("duration"),
    url: formData.get("url"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter all resource fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { itemId } = await context.params;
  const { data: currentItem } = await adminSupabase
    .from("ministry_leader_resource_items")
    .select("file_path")
    .eq("id", itemId)
    .limit(1)
    .maybeSingle();
  const uploadedFile = formData.get("file");
  const saved =
    uploadedFile instanceof File && uploadedFile.size
      ? await saveUploadedResourceFile(uploadedFile, "general")
      : null;
  const updatePayload: Record<string, unknown> = {
    title: payload.data.title,
    description: payload.data.description ?? "",
    icon: payload.data.icon || "file",
    resource_type: payload.data.resourceType,
    action_label: payload.data.actionLabel || payload.data.resourceType.toUpperCase(),
    duration: payload.data.duration || null,
    url: payload.data.url || null,
    display_order: payload.data.displayOrder,
    published: payload.data.status === "open",
    updated_at: new Date().toISOString()
  };

  if (saved) {
    updatePayload.file_path = saved.path;
    updatePayload.file_name = saved.name;
  }

  const { error } = await adminSupabase
    .from("ministry_leader_resource_items")
    .update(updatePayload)
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (saved && currentItem?.file_path) {
    await removeStoredResourceFile(currentItem.file_path);
  }

  revalidateResourcePages();

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
  const { data: currentItem } = await adminSupabase
    .from("ministry_leader_resource_items")
    .select("file_path")
    .eq("id", itemId)
    .limit(1)
    .maybeSingle();
  const { error } = await adminSupabase
    .from("ministry_leader_resource_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (currentItem?.file_path) {
    await removeStoredResourceFile(currentItem.file_path);
  }

  revalidateResourcePages();

  return NextResponse.json({ message: "Resource deleted." });
}
