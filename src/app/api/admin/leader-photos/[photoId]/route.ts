import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { encodePhotoDetails, slugifyPhotoTitle } from "@/lib/photo-library";
import { removeStoredResourceFile, saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ photoId: string }>;
};

const schema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().min(1),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidatePhotos() {
  revalidateTag("photo-library");
  revalidateTag("leader-resources");
  revalidatePath("/admin");
  revalidatePath("/leaders");
  revalidatePath("/leaders/photos");
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter all photo fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { photoId } = await context.params;
  const { data: currentItem } = await adminSupabase
    .from("leader_resource_items")
    .select("file_path,file_name")
    .eq("id", photoId)
    .maybeSingle();
  const slug = slugifyPhotoTitle(payload.data.slug);
  const uploadedFile = formData.get("file");
  const saved =
    uploadedFile instanceof File && uploadedFile.size
      ? await saveUploadedResourceFile(uploadedFile, "general")
      : null;
  const imagePath = saved || !currentItem?.file_path?.startsWith("/")
    ? `/api/leaders/photos/${slug}/image`
    : currentItem.file_path;
  const fileName = saved?.name || currentItem?.file_name || imagePath.split("/").pop() || `${slug}.jpg`;
  const details = encodePhotoDetails({
    id: slug,
    imagePath,
    fileName
  });
  const { error } = await adminSupabase
    .from("leader_resource_items")
    .update({
      title: payload.data.title,
      description: payload.data.description,
      eyebrow: "Image",
      resource_type: "tool",
      url: details,
      file_path: saved?.path ?? currentItem?.file_path ?? imagePath,
      file_name: fileName,
      display_order: payload.data.displayOrder,
      published: payload.data.status === "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", photoId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (saved && currentItem?.file_path) {
    await removeStoredResourceFile(currentItem.file_path);
  }

  revalidatePhotos();

  return NextResponse.json({ message: "Photo saved." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { photoId } = await context.params;
  const { error } = await adminSupabase.from("leader_resource_items").delete().eq("id", photoId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidatePhotos();

  return NextResponse.json({ message: "Photo deleted." });
}
