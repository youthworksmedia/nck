import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const resourceAssetKeys = ["music", "worksheet", "manual"] as const;

export type ResourceAssetKey = (typeof resourceAssetKeys)[number];

const uploadRoot = path.join(process.cwd(), "private-uploads", "resources");

export type ResourceLibraryFile = {
  id: string;
  kind: ResourceAssetKey;
  path: string;
  name: string;
  uploadedAt: string;
  sizeBytes: number;
};

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function getStoredFileName(fileName: string) {
  const safeName = sanitizeFileName(fileName || "file");
  return `${randomUUID()}-${safeName}`;
}

export function resolveStoredResourceFilePath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.join(uploadRoot, filePath);
}

export function getDisplayFileName(filePath: string) {
  const baseName = path.basename(filePath);
  return baseName.replace(/^[a-f0-9-]{36}-/i, "");
}

export async function saveUploadedResourceFile(file: File, kind: ResourceAssetKey) {
  const uploadDir = path.join(uploadRoot, kind);
  await mkdir(uploadDir, { recursive: true });

  const storedName = getStoredFileName(file.name);
  const relativePath = path.join(kind, storedName);
  const storedPath = path.join(uploadDir, storedName);
  const arrayBuffer = await file.arrayBuffer();

  await writeFile(storedPath, Buffer.from(arrayBuffer));

  return {
    path: relativePath,
    name: file.name
  };
}

export async function removeStoredResourceFile(filePath?: string | null) {
  if (!filePath) {
    return;
  }

  await rm(resolveStoredResourceFilePath(filePath), { force: true });
}

export async function listStoredResourceFiles(): Promise<ResourceLibraryFile[]> {
  await mkdir(uploadRoot, { recursive: true });

  const files = await Promise.all(
    resourceAssetKeys.map(async (kind) => {
      const directory = path.join(uploadRoot, kind);
      await mkdir(directory, { recursive: true });
      const entries = await readdir(directory, { withFileTypes: true });

      const records = await Promise.all(
        entries
          .filter((entry) => entry.isFile())
          .map(async (entry) => {
            const relativePath = path.join(kind, entry.name);
            const fileStats = await stat(path.join(directory, entry.name));

            return {
              id: relativePath,
              kind,
              path: relativePath,
              name: getDisplayFileName(entry.name),
              uploadedAt: fileStats.birthtime.toISOString(),
              sizeBytes: fileStats.size
            } satisfies ResourceLibraryFile;
          })
      );

      return records;
    })
  );

  return files.flat().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
