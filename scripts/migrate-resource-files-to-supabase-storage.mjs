import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");
const uploadRoot = path.join(projectRoot, "private-uploads", "resources");
const bucketName = process.env.SUPABASE_RESOURCE_BUCKET || "resource-files";

function loadEnvFile(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    const rawValue = trimmed.slice(index + 1);
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function contentTypeFor(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

async function walkFiles(directory) {
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(absolutePath);
      }

      return [absolutePath];
    })
  );

  return files.flat();
}

await loadEnvFile(await fs.readFile(envPath, "utf8"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { data: bucket } = await supabase.storage.getBucket(bucketName);

if (!bucket) {
  const { error } = await supabase.storage.createBucket(bucketName, {
    public: false
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(error.message);
  }
}

const files = await walkFiles(uploadRoot);
let uploaded = 0;
let failed = 0;

for (const filePath of files) {
  const relativePath = path.relative(uploadRoot, filePath).split(path.sep).join("/");
  const bytes = await fs.readFile(filePath);
  const { error } = await supabase.storage.from(bucketName).upload(relativePath, bytes, {
    contentType: contentTypeFor(filePath),
    upsert: true
  });

  if (error) {
    failed += 1;
    console.error(`Failed: ${relativePath} - ${error.message}`);
  } else {
    uploaded += 1;
  }
}

console.log(`Migrated ${uploaded} file(s) to Supabase Storage bucket "${bucketName}".`);

if (failed) {
  process.exitCode = 1;
}
