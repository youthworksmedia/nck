import type { ResourceAssetKey } from "@/lib/resource-assets";
import type {
  LessonPodcastLink,
  LessonResourceAttachment,
  LessonResourceProgramKey,
  LessonResourceType
} from "@/types";

export const lessonResourceTypes = ["pdf", "game", "music", "video"] as const;
const defaultBigIdea = "Big Idea coming soon.";

export type LessonResourcePayload = {
  files: LessonResourceAttachment[];
  preschoolFiles: LessonResourceAttachment[];
  bigIdea: string;
  podcastTitle: string;
  podcastLinks: LessonPodcastLink[];
};

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
  void type;
  return "general";
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
    icon: clean(entry.icon),
    name,
    filePath,
    fileName: fileName || name,
    includeCopyright: entry.includeCopyright === true,
    sizeBytes:
      typeof entry.sizeBytes === "number"
        ? entry.sizeBytes
        : typeof entry.size_bytes === "number"
          ? entry.size_bytes
          : undefined
  };
}

function normalizePodcastLink(value: unknown): LessonPodcastLink | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const label = clean(entry.label ?? entry.name ?? entry.whereToFindIt);
  const url = clean(entry.url);

  if (!label || !url) {
    return null;
  }

  return {
    id: clean(entry.id) || crypto.randomUUID(),
    label,
    url
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
      fileName: resource.manual_file_name || "manual",
      includeCopyright: false
    });
  }

  if (resource.worksheet_file_path) {
    files.push({
      id: "worksheet",
      type: "pdf",
      name: resource.worksheet_file_name || "Worksheet",
      filePath: resource.worksheet_file_path,
      fileName: resource.worksheet_file_name || "worksheet",
      includeCopyright: false
    });
  }

  if (resource.music_file_path) {
    files.push({
      id: "music",
      type: "music",
      name: resource.music_file_name || "Music",
      filePath: resource.music_file_path,
      fileName: resource.music_file_name || "music",
      includeCopyright: false
    });
  }

  return files;
}

export function parseLessonResourcePayload(
  fileUrl: unknown,
  legacyResource?: LegacyResourceRow
): LessonResourcePayload {
  const source = clean(fileUrl);

  if (source.startsWith("{") || source.startsWith("[")) {
    try {
      const parsed = JSON.parse(source) as unknown;
      const fileContainer = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      const rawFiles = Array.isArray(parsed)
        ? parsed
        : fileContainer && Array.isArray(fileContainer.files)
          ? fileContainer.files
          : [];
      const files = rawFiles
        .map((entry) => normalizeAttachment(entry))
        .filter((entry): entry is LessonResourceAttachment => Boolean(entry));

      if (files.length || fileContainer) {
        const rawPreschoolFiles = Array.isArray(fileContainer?.preschoolFiles) ? fileContainer.preschoolFiles : [];
        const preschoolFiles = rawPreschoolFiles
          .map((entry) => normalizeAttachment(entry))
          .filter((entry): entry is LessonResourceAttachment => Boolean(entry));

        return {
          files,
          preschoolFiles,
          bigIdea: clean(fileContainer?.bigIdea) || defaultBigIdea,
          podcastTitle: clean(fileContainer?.podcastTitle),
          podcastLinks: Array.isArray(fileContainer?.podcastLinks)
            ? fileContainer.podcastLinks
                .map((entry) => normalizePodcastLink(entry))
                .filter((entry): entry is LessonPodcastLink => Boolean(entry))
            : []
        };
      }
    } catch {
      // Fall through to legacy columns below.
    }
  }

  return {
    files: legacyResource ? legacyLessonResourceFiles(legacyResource) : [],
    preschoolFiles: [],
    bigIdea: defaultBigIdea,
    podcastTitle: "",
    podcastLinks: []
  };
}

export function parseLessonResourceFiles(
  fileUrl: unknown,
  legacyResource?: LegacyResourceRow
): LessonResourceAttachment[] {
  return parseLessonResourcePayload(fileUrl, legacyResource).files;
}

export function serializeLessonResourceFiles(payload: LessonResourcePayload) {
  return JSON.stringify({
    version: 2,
    files: payload.files,
    preschoolFiles: payload.preschoolFiles,
    bigIdea: payload.bigIdea.trim() || defaultBigIdea,
    podcastTitle: payload.podcastTitle.trim(),
    podcastLinks: payload.podcastLinks.filter((entry) => entry.label.trim() && entry.url.trim())
  });
}

export function getLessonResourceAttachmentsByProgram(
  payload: LessonResourcePayload,
  program: LessonResourceProgramKey,
  lessonNumber?: number | null
) {
  if (program === "preschool") {
    if (payload.preschoolFiles.length) {
      return payload.preschoolFiles;
    }

    if ((lessonNumber ?? 0) === 1) {
      return payload.files;
    }

    return [];
  }

  return payload.files;
}
