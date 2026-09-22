import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  encodePhotoDetails,
  leaderPhotosSectionId,
  leaderPhotosSectionTitle,
  slugifyPhotoTitle
} from "@/lib/photo-library";
import { saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
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

async function ensurePhotosSection() {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("Supabase admin access is required.");
  }

  const { error } = await adminSupabase.from("leader_resource_sections").upsert(
    {
      id: leaderPhotosSectionId,
      title: leaderPhotosSectionTitle,
      description: "Hidden source section for editable Image Library entries.",
      display_order: 98,
      published: false,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return adminSupabase;
}

export async function POST(request: Request) {
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

  const uploadedFile = formData.get("file");

  if (!(uploadedFile instanceof File) || !uploadedFile.size || !uploadedFile.type.startsWith("image/")) {
    return NextResponse.json({ message: "Please upload an image file." }, { status: 400 });
  }

  const adminSupabase = await ensurePhotosSection();
  const slug = slugifyPhotoTitle(payload.data.slug || payload.data.title);
  const saved = await saveUploadedResourceFile(uploadedFile, "general");
  const imagePath = `/api/leaders/photos/${slug}/image`;
  const details = encodePhotoDetails({
    id: slug,
    imagePath,
    fileName: saved.name
  });
  const { error } = await adminSupabase.from("leader_resource_items").insert({
    section_id: leaderPhotosSectionId,
    title: payload.data.title,
    description: payload.data.description,
    eyebrow: "Image",
    resource_type: "tool",
    url: details,
    file_path: saved.path,
    file_name: saved.name,
    display_order: payload.data.displayOrder,
    published: payload.data.status === "open"
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidatePhotos();

  return NextResponse.json({ message: "Photo added." });
}
