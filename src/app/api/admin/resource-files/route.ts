import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  listStoredResourceFiles,
  removeStoredResourceFile,
  saveUploadedResourceFile
} from "@/lib/resource-assets";
import { parseLessonResourceFiles, serializeLessonResourceFiles } from "@/lib/lesson-resource-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const deleteSchema = z.object({
  path: z.string().min(1),
  kind: z.enum(["general"])
});

export async function GET() {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const files = await listStoredResourceFiles();

  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const kind = formData.get("kind");
  const file = formData.get("file");
  const parsedKind = deleteSchema.shape.kind.safeParse(kind);

  if (!parsedKind.success) {
    return NextResponse.json({ message: "Please choose a valid file type." }, { status: 400 });
  }

  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ message: "Please choose a file to upload." }, { status: 400 });
  }

  const saved = await saveUploadedResourceFile(file, parsedKind.data);

  return NextResponse.json({
    message: `${saved.name} uploaded to the file library.`,
    file: saved
  });
}

export async function DELETE(request: Request) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = deleteSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Could not delete this file." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Admin content tools are not ready." }, { status: 400 });
  }

  const pathColumn = "manual_file_path";
  const nameColumn = "manual_file_name";

  let { error: updateError } = await adminSupabase
    .from("resources")
    .update({
      [pathColumn]: null,
      [nameColumn]: null
    })
    .eq(pathColumn, payload.data.path);

  if (updateError?.message?.includes(`'${nameColumn}' column`)) {
    const retry = await adminSupabase
      .from("resources")
      .update({
        [pathColumn]: null
      })
      .eq(pathColumn, payload.data.path);

    updateError = retry.error;
  }

  if (updateError?.message?.includes(`'${pathColumn}' column`)) {
    updateError = null;
  }

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 });
  }

  const { data: resources } = await adminSupabase
    .from("resources")
    .select("*");

  await Promise.all(
    (resources ?? []).map(async (resource) => {
      const resourceFiles = parseLessonResourceFiles(resource.file_url, resource);
      const retainedFiles = resourceFiles.filter((entry) => entry.filePath !== payload.data.path);

      if (retainedFiles.length === resourceFiles.length) {
        return;
      }

      await adminSupabase
        .from("resources")
        .update({
          file_url: serializeLessonResourceFiles(retainedFiles)
        })
        .eq("id", resource.id);
    })
  );

  await removeStoredResourceFile(payload.data.path);

  return NextResponse.json({ message: "File deleted from the library." });
}
