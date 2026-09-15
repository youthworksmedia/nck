import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { getDisplayFileName, saveUploadedResourceFile } from "@/lib/resource-assets";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  curriculumSections,
  curriculumSectionStorageValues,
  curriculumYears,
  curriculumYearStorageValues,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import {
  type LessonResourcePayload,
  normalizeLessonResourceType,
  serializeLessonResourceFiles,
  storageKindForLessonResourceType
} from "@/lib/lesson-resource-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LessonPodcastLink, LessonResourceAttachment } from "@/types";

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
  bigIdea: z.string().min(1),
  yearCycle: z.preprocess((value) => normalizeCurriculumYear(String(value ?? "")), z.enum(curriculumYears)),
  term: z.preprocess((value) => normalizeCurriculumSection(String(value ?? "")), z.enum(curriculumSections)),
  publishDate: dateString,
  expiryDate: dateString.optional().or(z.literal("")),
  status: z.enum(["open", "closed"])
});

function parsePodcastLinks(formData: FormData): LessonPodcastLink[] {
  try {
    const parsed = JSON.parse(String(formData.get("podcastLinks") ?? "[]")) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const record = entry as Record<string, unknown>;
        const label = typeof record.label === "string" ? record.label.trim() : "";
        const url = typeof record.url === "string" ? record.url.trim() : "";

        if (!label || !url) {
          return null;
        }

        return {
          id: typeof record.id === "string" && record.id ? record.id : crypto.randomUUID(),
          label,
          url
        } satisfies LessonPodcastLink;
      })
      .filter((entry): entry is LessonPodcastLink => Boolean(entry));
  } catch {
    return [];
  }
}

async function getResourceFiles(formData: FormData, fieldName: string): Promise<LessonResourceAttachment[]> {
  let rawEntries: Array<Record<string, unknown>> = [];

  try {
    const parsed = JSON.parse(String(formData.get(fieldName) ?? "[]")) as unknown;
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
    const isPdf = fileName.split("?")[0]?.toLowerCase().endsWith(".pdf") ?? false;

    files.push({
      id,
      type,
      icon: typeof rawEntry.icon === "string" ? rawEntry.icon.trim() : "",
      name,
      filePath,
      fileName,
      includeCopyright: isPdf && rawEntry.includeCopyright === true,
      sizeBytes:
        saved
          ? upload instanceof File
            ? upload.size
            : undefined
          : typeof rawEntry.sizeBytes === "number"
            ? rawEntry.sizeBytes
            : undefined
    });
  }

  return files;
}

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
    bigIdea: formData.get("bigIdea"),
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

  const schoolAgeFiles = await getResourceFiles(formData, "schoolAgeResourceFiles");
  const preschoolFiles = await getResourceFiles(formData, "preschoolResourceFiles");
  const podcastTitle = String(formData.get("podcastTitle") ?? "").trim();
  const podcastLinks = parsePodcastLinks(formData);
  const resourcePayload: LessonResourcePayload = {
    files: schoolAgeFiles,
    preschoolFiles,
    bigIdea: payload.data.bigIdea,
    podcastTitle,
    podcastLinks
  };
  const firstMusic = schoolAgeFiles.find((entry) => entry.type === "music") ?? null;
  const firstDocument = schoolAgeFiles.find((entry) => entry.type !== "music") ?? null;
  const { data: latestInTerm, error: latestInTermError } = await adminSupabase
    .from("resources")
    .select("lesson_number")
    .in("year_cycle", curriculumYearStorageValues(payload.data.yearCycle))
    .in("term", curriculumSectionStorageValues(payload.data.term))
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
    file_url: serializeLessonResourceFiles(resourcePayload),
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

  revalidateTag("resources");
  revalidatePath("/resources");
  revalidatePath("/admin");

  return NextResponse.json({ message: "Lesson added to the curriculum library." });
}
