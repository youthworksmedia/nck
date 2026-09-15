import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  term: z.coerce.number().int().min(1).max(6),
  memoryText: z.string().trim().optional(),
  memoryUrl: z.string().trim().optional(),
  memoryText2: z.string().trim().optional(),
  memoryUrl2: z.string().trim().optional(),
  readingGuideUrl: z.string().trim().optional(),
  readingGuideCanvaUrl: z.string().trim().url().or(z.literal("")).optional(),
  parentDevotionUrl: z.string().trim().optional(),
  parentDevotionCanvaUrl: z.string().trim().url().or(z.literal("")).optional(),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateFamilyPages() {
  revalidateTag("family-resources");
  revalidatePath("/admin");
  revalidatePath("/family");
}

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    term: formData.get("term"),
    memoryText: formData.get("memoryText"),
    memoryUrl: formData.get("memoryUrl"),
    memoryText2: formData.get("memoryText2"),
    memoryUrl2: formData.get("memoryUrl2"),
    readingGuideUrl: formData.get("readingGuideUrl"),
    readingGuideCanvaUrl: formData.get("readingGuideCanvaUrl"),
    parentDevotionUrl: formData.get("parentDevotionUrl"),
    parentDevotionCanvaUrl: formData.get("parentDevotionCanvaUrl"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter the memory verse fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const memoryFile = formData.get("memoryFile");
  const memoryFile2 = formData.get("memoryFile2");
  const readingGuideFile = formData.get("readingGuideFile");
  const parentDevotionFile = formData.get("parentDevotionFile");
  const memoryUpload =
    memoryFile instanceof File && memoryFile.size ? await saveUploadedResourceFile(memoryFile, "general") : null;
  const memoryUpload2 =
    memoryFile2 instanceof File && memoryFile2.size ? await saveUploadedResourceFile(memoryFile2, "general") : null;
  const readingGuideUpload =
    readingGuideFile instanceof File && readingGuideFile.size
      ? await saveUploadedResourceFile(readingGuideFile, "general")
      : null;
  const parentDevotionUpload =
    parentDevotionFile instanceof File && parentDevotionFile.size
      ? await saveUploadedResourceFile(parentDevotionFile, "general")
      : null;
  const memoryUrl = memoryUpload?.path ?? (payload.data.memoryUrl || null);
  const memoryUrl2 = memoryUpload2?.path ?? (payload.data.memoryUrl2 || null);
  const readingGuideUrl = readingGuideUpload?.path ?? (payload.data.readingGuideUrl || null);
  const parentDevotionUrl = parentDevotionUpload?.path ?? (payload.data.parentDevotionUrl || null);
  const memoryItems = [
    {
      text: payload.data.memoryText ?? "",
      url: memoryUrl
    },
    {
      text: payload.data.memoryText2 ?? "",
      url: memoryUrl2
    }
  ];

  const { error } = await adminSupabase
    .from("family_resource_terms")
    .upsert(
      {
        term: payload.data.term,
        memory_text: JSON.stringify({ items: memoryItems }),
        memory_url: memoryUrl,
        reading_guide_url: readingGuideUrl,
        reading_guide_canva_url: payload.data.readingGuideCanvaUrl || null,
        parent_devotion_url: parentDevotionUrl,
        parent_devotion_canva_url: payload.data.parentDevotionCanvaUrl || null,
        published: payload.data.status === "open",
        updated_at: new Date().toISOString()
      },
      { onConflict: "term" }
    );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFamilyPages();

  return NextResponse.json({ message: "Family memory verse saved." });
}
