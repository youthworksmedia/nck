import { NextResponse } from "next/server";
import { z } from "zod";

import { getDisplayFileName, saveUploadedResourceFile } from "@/lib/resource-assets";
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

export async function POST(request: Request) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Admin login required." }, { status: 401 });
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
  const { data: latestInTerm, error: latestInTermError } = await adminSupabase
    .from("resources")
    .select("lesson_number")
    .eq("year_cycle", payload.data.yearCycle)
    .eq("term", payload.data.term)
    .order("lesson_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hasLessonNumberColumn = !isMissingColumn(latestInTermError?.message, "lesson_number");
  const nextLessonNumber = (latestInTerm?.lesson_number ?? 0) + 1;

  const insertPayload = {
    title: payload.data.title,
    description: payload.data.description,
    scripture: payload.data.scripture,
    year_cycle: payload.data.yearCycle,
    term: payload.data.term,
    category: "Curriculum",
    format: "",
    file_url: "",
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
    insertPayload.lesson_number = nextLessonNumber;
  }

  let error: { message: string } | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await adminSupabase.from("resources").insert(insertPayload);
    error = result.error;

    if (!error) {
      break;
    }

    const missingColumn = getMissingColumn(error.message);

    if (!missingColumn || !(missingColumn in insertPayload)) {
      break;
    }

    delete insertPayload[missingColumn];
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Lesson added to the curriculum library." });
}
