import { NextResponse } from "next/server";
import { z } from "zod";

import { getDisplayFileName, removeStoredResourceFile, saveUploadedResourceFile } from "@/lib/resource-assets";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isMissingColumn(errorMessage: string | undefined, column: string) {
  return Boolean(errorMessage?.includes(`'${column}' column`));
}

function getMissingColumn(errorMessage: string | undefined) {
  const match = errorMessage?.match(/'([^']+)' column/);
  return match?.[1] ?? null;
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  scripture: z.string().min(1),
  yearCycle: z.enum(["Year A", "Year B", "Year C"]),
  term: z.enum(["Term 1", "Term 2", "Term 3", "Term 4"]),
  publishDate: dateString,
  expiryDate: dateString.optional().or(z.literal("")),
  status: z.enum(["open", "closed"])
});

type RouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    scripture: formData.get("scripture"),
    yearCycle: formData.get("yearCycle"),
    term: formData.get("term"),
    publishDate: formData.get("publishDate"),
    expiryDate: formData.get("expiryDate"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter all lesson fields correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin content changes." },
      { status: 400 }
    );
  }

  const { resourceId } = await context.params;

  const { data: existingResource, error: existingError } = await adminSupabase
    .from("resources")
    .select("*")
    .eq("id", resourceId)
    .limit(1)
    .maybeSingle();

  if (existingError || !existingResource) {
    return NextResponse.json({ message: "Lesson not found." }, { status: 404 });
  }

  const musicFile = formData.get("musicFile");
  const worksheetFile = formData.get("worksheetFile");
  const manualFile = formData.get("manualFile");
  const existingMusicPath = String(formData.get("existingMusicPath") ?? "").trim();
  const existingWorksheetPath = String(formData.get("existingWorksheetPath") ?? "").trim();
  const existingManualPath = String(formData.get("existingManualPath") ?? "").trim();

  const savedMusic =
    musicFile instanceof File && musicFile.size ? await saveUploadedResourceFile(musicFile, "music") : null;
  const savedWorksheet =
    worksheetFile instanceof File && worksheetFile.size ? await saveUploadedResourceFile(worksheetFile, "worksheet") : null;
  const savedManual =
    manualFile instanceof File && manualFile.size ? await saveUploadedResourceFile(manualFile, "manual") : null;
  const nextMusicPath = savedMusic?.path || existingMusicPath || null;
  const nextWorksheetPath = savedWorksheet?.path || existingWorksheetPath || null;
  const nextManualPath = savedManual?.path || existingManualPath || null;
  const movedTerm =
    existingResource.year_cycle !== payload.data.yearCycle || existingResource.term !== payload.data.term;
  let hasLessonNumberColumn = true;
  let nextLessonNumber: number | null = null;

  const lessonNumberLookup = await adminSupabase
    .from("resources")
    .select("lesson_number")
    .eq("id", resourceId)
    .limit(1)
    .maybeSingle();

  if (isMissingColumn(lessonNumberLookup.error?.message, "lesson_number")) {
    hasLessonNumberColumn = false;
  } else if (lessonNumberLookup.error) {
    return NextResponse.json({ message: lessonNumberLookup.error.message }, { status: 400 });
  } else {
    nextLessonNumber = lessonNumberLookup.data?.lesson_number ?? null;
  }

  if (movedTerm && hasLessonNumberColumn) {
    const { data: latestInTargetTerm, error: latestInTargetTermError } = await adminSupabase
      .from("resources")
      .select("lesson_number")
      .eq("year_cycle", payload.data.yearCycle)
      .eq("term", payload.data.term)
      .neq("id", resourceId)
      .order("lesson_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!isMissingColumn(latestInTargetTermError?.message, "lesson_number")) {
      nextLessonNumber = (latestInTargetTerm?.lesson_number ?? 0) + 1;
    } else {
      hasLessonNumberColumn = false;
    }
  }

  const updatePayload = {
    title: payload.data.title,
    description: payload.data.description,
    scripture: payload.data.scripture,
    year_cycle: payload.data.yearCycle,
    term: payload.data.term,
    category: "Curriculum",
    format: "",
    music_file_path: nextMusicPath,
    music_file_name: savedMusic?.name ?? (nextMusicPath ? getDisplayFileName(nextMusicPath) : null),
    worksheet_file_path: nextWorksheetPath,
    worksheet_file_name:
      savedWorksheet?.name ?? (nextWorksheetPath ? getDisplayFileName(nextWorksheetPath) : null),
    manual_file_path: nextManualPath,
    manual_file_name: savedManual?.name ?? (nextManualPath ? getDisplayFileName(nextManualPath) : null),
    publish_date: payload.data.publishDate,
    expiry_date: payload.data.expiryDate || null,
    published: payload.data.status === "open"
  } as Record<string, unknown>;

  if (hasLessonNumberColumn) {
    updatePayload.lesson_number = nextLessonNumber;
  }

  let error: { message: string } | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await adminSupabase.from("resources").update(updatePayload).eq("id", resourceId);
    error = result.error;

    if (!error) {
      break;
    }

    const missingColumn = getMissingColumn(error.message);

    if (!missingColumn || !(missingColumn in updatePayload)) {
      break;
    }

    delete updatePayload[missingColumn];
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (savedMusic) {
    await removeStoredResourceFile(existingResource.music_file_path);
  }
  if (savedWorksheet) {
    await removeStoredResourceFile(existingResource.worksheet_file_path);
  }
  if (savedManual) {
    await removeStoredResourceFile(existingResource.manual_file_path);
  }

  return NextResponse.json({ message: "Lesson updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin content changes." },
      { status: 400 }
    );
  }

  const { resourceId } = await context.params;

  const { data: existingResource } = await adminSupabase
    .from("resources")
    .select("*")
    .eq("id", resourceId)
    .limit(1)
    .maybeSingle();

  const { error } = await adminSupabase.from("resources").delete().eq("id", resourceId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (existingResource) {
    await removeStoredResourceFile(existingResource.music_file_path);
    await removeStoredResourceFile(existingResource.worksheet_file_path);
    await removeStoredResourceFile(existingResource.manual_file_path);
  }

  return NextResponse.json({ message: "Lesson deleted." });
}
