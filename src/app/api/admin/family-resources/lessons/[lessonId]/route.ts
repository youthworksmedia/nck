import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { saveUploadedResourceFile } from "@/lib/resource-assets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

const schema = z.object({
  term: z.coerce.number().int().min(1).max(6),
  lessonNumber: z.coerce.number().int().min(1),
  title: z.string().trim().min(1),
  scripture: z.string().trim().optional(),
  discussionUrl: z.string().trim().optional(),
  activityUrl: z.string().trim().optional(),
  memoryUrl: z.string().trim().optional(),
  memoryText: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateFamilyPages() {
  revalidateTag("family-resources");
  revalidatePath("/admin");
  revalidatePath("/family");
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    term: formData.get("term"),
    lessonNumber: formData.get("lessonNumber"),
    title: formData.get("title"),
    scripture: formData.get("scripture"),
    discussionUrl: formData.get("discussionUrl"),
    activityUrl: formData.get("activityUrl"),
    memoryUrl: formData.get("memoryUrl"),
    memoryText: formData.get("memoryText"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter all lesson fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { lessonId } = await context.params;
  const discussionFile = formData.get("discussionFile");
  const activityFile = formData.get("activityFile");
  const memoryFile = formData.get("memoryFile");
  const [discussionUpload, activityUpload, memoryUpload] = await Promise.all([
    discussionFile instanceof File && discussionFile.size ? saveUploadedResourceFile(discussionFile, "general") : null,
    activityFile instanceof File && activityFile.size ? saveUploadedResourceFile(activityFile, "general") : null,
    memoryFile instanceof File && memoryFile.size ? saveUploadedResourceFile(memoryFile, "general") : null
  ]);

  const { error } = await adminSupabase
    .from("family_resource_lessons")
    .update({
      term: payload.data.term,
      lesson_number: payload.data.lessonNumber,
      title: payload.data.title,
      scripture: payload.data.scripture ?? "",
      discussion_url: discussionUpload?.path ?? (payload.data.discussionUrl || null),
      activity_url: activityUpload?.path ?? (payload.data.activityUrl || null),
      memory_url: memoryUpload?.path ?? (payload.data.memoryUrl || null),
      memory_text: null,
      display_order: payload.data.displayOrder,
      published: payload.data.status === "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", lessonId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFamilyPages();

  return NextResponse.json({ message: "Family lesson saved." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { lessonId } = await context.params;
  const { error } = await adminSupabase.from("family_resource_lessons").delete().eq("id", lessonId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFamilyPages();

  return NextResponse.json({ message: "Family lesson deleted." });
}
