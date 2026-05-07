import { NextResponse } from "next/server";
import { z } from "zod";

import { getDisplayFileName, removeStoredResourceFile, saveUploadedResourceFile } from "@/lib/resource-assets";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  parseLessonResourceFiles,
  normalizeLessonResourceType,
  serializeLessonResourceFiles,
  storageKindForLessonResourceType
} from "@/lib/lesson-resource-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LessonResourceAttachment } from "@/types";

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

async function getResourceFiles(formData: FormData): Promise<LessonResourceAttachment[]> {
  let rawEntries: Array<Record<string, unknown>> = [];

  try {
    const parsed = JSON.parse(String(formData.get("resourceFiles") ?? "[]")) as unknown;
    rawEntries = Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
  } catch {
    rawEntries = [];
  }

  const files: LessonResourceAttachment[] = [];

  for (const rawEntry of rawEntries) {
    const id = typeof rawEntry.id === "string" && rawEntry.id ? rawEntry.id : crypto.randomUUID();
    const type = normalizeLessonResourceType(rawEntry.type);
    const upload = formData.get(`resourceFile-${id}`);
    const saved =
      upload instanceof File && upload.size
        ? await saveUploadedResourceFile(upload, storageKindForLessonResourceType(type))
        : null;
    const filePath =
      saved?.path ||
      (typeof rawEntry.filePath === "string" ? rawEntry.filePath.trim() : "") ||
      "";

    if (!filePath) {
      continue;
    }

    const fileName =
      saved?.name ||
      (typeof rawEntry.fileName === "string" ? rawEntry.fileName.trim() : "") ||
      getDisplayFileName(filePath);
    const name = (typeof rawEntry.name === "string" ? rawEntry.name.trim() : "") || fileName || "Resource";

    files.push({
      id,
      type,
      name,
      filePath,
      fileName
    });
  }

  return files;
}

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

  const previousResourceFiles = parseLessonResourceFiles(existingResource.file_url, existingResource);
  const resourceFiles = await getResourceFiles(formData);
  const firstMusic = resourceFiles.find((entry) => entry.type === "music") ?? null;
  const firstDocument = resourceFiles.find((entry) => entry.type !== "music") ?? null;
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
    file_url: serializeLessonResourceFiles(resourceFiles),
    music_file_path: firstMusic?.filePath ?? null,
    music_file_name: firstMusic?.fileName ?? null,
    worksheet_file_path: null,
    worksheet_file_name: null,
    manual_file_path: firstDocument?.filePath ?? null,
    manual_file_name: firstDocument?.fileName ?? null,
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

  const retainedPaths = new Set(resourceFiles.map((entry) => entry.filePath));
  await Promise.all(
    previousResourceFiles
      .filter((entry) => !retainedPaths.has(entry.filePath))
      .map((entry) => removeStoredResourceFile(entry.filePath))
  );

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
    const paths = new Set([
      ...parseLessonResourceFiles(existingResource.file_url, existingResource).map((entry) => entry.filePath),
      existingResource.music_file_path,
      existingResource.worksheet_file_path,
      existingResource.manual_file_path
    ]);
    await Promise.all([...paths].map((path) => removeStoredResourceFile(path)));
  }

  return NextResponse.json({ message: "Lesson deleted." });
}
