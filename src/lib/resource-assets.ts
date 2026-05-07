import { randomUUID } from "node:crypto";

import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const resourceAssetKeys = ["general"] as const;
const legacyResourceAssetKeys = ["manual", "music", "worksheet"] as const;

export type ResourceAssetKey = (typeof resourceAssetKeys)[number];

export type ResourceLibraryFile = {
  id: string;
  kind: ResourceAssetKey;
  path: string;
  name: string;
  uploadedAt: string;
  sizeBytes: number;
};

export type StoredResourceFile = {
  bytes: Uint8Array;
  contentType: string;
};

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function getStoredFileName(fileName: string) {
  const safeName = sanitizeFileName(fileName || "file");
  return `${randomUUID()}-${safeName}`;
}

export function getStoredResourceBucketName() {
  return serverEnv.supabaseResourceBucket || "resource-files";
}

export function getDisplayFileName(filePath: string) {
  const baseName = filePath.split("/").pop() ?? filePath;
  return baseName.replace(/^[a-f0-9-]{36}-/i, "");
}

export function getResourceFileContentType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

export function normalizeResourceStoragePath(filePath?: string | null) {
  if (!filePath) {
    return null;
  }

  const cleaned = filePath.replaceAll("\\", "/").replace(/^\/+/, "");
  const [kind] = cleaned.split("/");

  if (
    ![...resourceAssetKeys, ...legacyResourceAssetKeys].includes(kind as ResourceAssetKey | (typeof legacyResourceAssetKeys)[number]) ||
    cleaned.includes("..") ||
    cleaned.endsWith("/")
  ) {
    return null;
  }

  return cleaned;
}

async function ensureResourceBucket() {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for resource file storage.");
  }

  const bucketName = getStoredResourceBucketName();
  const { data: bucket } = await adminSupabase.storage.getBucket(bucketName);

  if (!bucket) {
    const { error } = await adminSupabase.storage.createBucket(bucketName, {
      public: false
    });

    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(error.message);
    }
  }

  return adminSupabase.storage.from(bucketName);
}

export async function saveUploadedResourceFile(file: File, kind: ResourceAssetKey) {
  const bucket = await ensureResourceBucket();
  const storedName = getStoredFileName(file.name);
  const relativePath = `${kind}/${storedName}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await bucket.upload(relativePath, Buffer.from(arrayBuffer), {
    contentType: file.type || getResourceFileContentType(file.name),
    upsert: false
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path: relativePath,
    name: file.name
  };
}

export async function removeStoredResourceFile(filePath?: string | null) {
  const storagePath = normalizeResourceStoragePath(filePath);

  if (!storagePath) {
    return;
  }

  const bucket = await ensureResourceBucket();
  await bucket.remove([storagePath]);
}

export async function listStoredResourceFiles(): Promise<ResourceLibraryFile[]> {
  const bucket = await ensureResourceBucket();

  const files = await Promise.all(
    resourceAssetKeys.map(async (kind) => {
      const { data, error } = await bucket.list(kind, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" }
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? [])
        .filter((entry) => entry.name && entry.id !== null)
        .map((entry) => {
          const storagePath = `${kind}/${entry.name}`;

          return {
            id: storagePath,
            kind,
            path: storagePath,
            name: getDisplayFileName(entry.name),
            uploadedAt: entry.created_at ?? entry.updated_at ?? new Date().toISOString(),
            sizeBytes:
              typeof entry.metadata?.size === "number" ? entry.metadata.size : 0
          } satisfies ResourceLibraryFile;
        });
    })
  );

  return files.flat().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function downloadStoredResourceFile(
  filePath?: string | null,
  fileName = "download.bin"
): Promise<StoredResourceFile | null> {
  const storagePath = normalizeResourceStoragePath(filePath);

  if (!storagePath) {
    return null;
  }

  const bucket = await ensureResourceBucket();
  const { data, error } = await bucket.download(storagePath);

  if (error || !data) {
    return null;
  }

  return {
    bytes: new Uint8Array(await data.arrayBuffer()),
    contentType: data.type || getResourceFileContentType(fileName)
  };
}
