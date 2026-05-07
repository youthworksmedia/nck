import type { ResourceAssetKey } from "@/lib/resource-assets";
import type { LessonResourceAttachment, LessonResourceType } from "@/types";

export const lessonResourceTypes = ["pdf", "game", "music", "video"] as const;

type LegacyResourceRow = {
  manual_file_path?: string | null;
  manual_file_name?: string | null;
  worksheet_file_path?: string | null;
  worksheet_file_name?: string | null;
  music_file_path?: string | null;
  music_file_name?: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLessonResourceType(value: unknown): LessonResourceType {
  return lessonResourceTypes.includes(value as LessonResourceType)
    ? (value as LessonResourceType)
    : "pdf";
}

export function storageKindForLessonResourceType(type: LessonResourceType): ResourceAssetKey {
  return type === "music" ? "music" : "manual";
}

function normalizeAttachment(value: unknown): LessonResourceAttachment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const filePath = clean(entry.filePath ?? entry.file_path ?? entry.path);
  const fileName = clean(entry.fileName ?? entry.file_name ?? entry.filename);

  if (!filePath) {
    return null;
  }

  const id = clean(entry.id) || crypto.randomUUID();
  const name = clean(entry.name) || fileName || "Resource";

  return {
    id,
    type: normalizeLessonResourceType(entry.type),
    name,
    filePath,
    fileName: fileName || name
  };
}

export function legacyLessonResourceFiles(resource: LegacyResourceRow): LessonResourceAttachment[] {
  const files: LessonResourceAttachment[] = [];

  if (resource.manual_file_path) {
    files.push({
      id: "manual",
      type: "pdf",
      name: resource.manual_file_name || "Manual",
      filePath: resource.manual_file_path,
      fileName: resource.manual_file_name || "manual"
    });
  }

  if (resource.worksheet_file_path) {
    files.push({
      id: "worksheet",
      type: "pdf",
      name: resource.worksheet_file_name || "Worksheet",
      filePath: resource.worksheet_file_path,
      fileName: resource.worksheet_file_name || "worksheet"
    });
  }

  if (resource.music_file_path) {
    files.push({
      id: "music",
      type: "music",
      name: resource.music_file_name || "Music",
      filePath: resource.music_file_path,
      fileName: resource.music_file_name || "music"
    });
  }

  return files;
}

export function parseLessonResourceFiles(
  fileUrl: unknown,
  legacyResource?: LegacyResourceRow
): LessonResourceAttachment[] {
  const source = clean(fileUrl);

  if (source.startsWith("{") || source.startsWith("[")) {
    try {
      const parsed = JSON.parse(source) as unknown;
      const rawFiles = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { files?: unknown }).files)
          ? (parsed as { files: unknown[] }).files
          : [];
      const files = rawFiles
        .map((entry) => normalizeAttachment(entry))
        .filter((entry): entry is LessonResourceAttachment => Boolean(entry));

      if (files.length) {
        return files;
      }
    } catch {
      // Fall through to legacy columns below.
    }
  }

  return legacyResource ? legacyLessonResourceFiles(legacyResource) : [];
}

export function serializeLessonResourceFiles(files: LessonResourceAttachment[]) {
  return JSON.stringify({
    version: 1,
    files
  });
}
