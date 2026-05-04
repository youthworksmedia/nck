import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import { NextResponse } from "next/server";

import { resolveStoredResourceFilePath } from "@/lib/resource-assets";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const assetMap = {
  manual: {
    path: "manual_file_path",
    label: "manual"
  },
  workbook: {
    path: "worksheet_file_path",
    label: "workbook"
  }
} as const;

function cleanIds(ids: string | null) {
  return (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isPdfFile(filePath: string) {
  return path.extname(filePath).toLowerCase() === ".pdf";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as keyof typeof assetMap | null;
  const ids = cleanIds(url.searchParams.get("ids"));
  const year = url.searchParams.get("year") ?? "Year A";
  const term = url.searchParams.get("term") ?? "Term 1";

  if (!kind || !(kind in assetMap) || !ids.length) {
    return NextResponse.json({ message: "Choose lessons and a valid custom pack type." }, { status: 400 });
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getMembershipSnapshot()]);

  if (!user || !["active", "trialing"].includes(membership.subscriptionStatus)) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Custom pack downloads are not ready." }, { status: 400 });
  }

  const { path: pathColumn, label } = assetMap[kind];

  const { data: resources, error } = await adminSupabase
    .from("resources")
    .select("*")
    .in("id", ids)
    .eq("published", true);

  if (error || !resources?.length) {
    return NextResponse.json({ message: "No matching lessons found." }, { status: 404 });
  }

  const orderedResources = ids
    .map((id) => resources.find((resource) => resource.id === id))
    .filter((resource): resource is NonNullable<typeof resource> => Boolean(resource))
    .filter(
      (resource) => (resource.year_cycle ?? "Year A") === year && (resource.term ?? "Term 1") === term
    )
    .sort((a, b) => (a.lesson_number ?? 0) - (b.lesson_number ?? 0));

  const sourceFiles = orderedResources
    .map((resource) => resource[pathColumn] as string | null)
    .filter((filePath): filePath is string => typeof filePath === "string" && isPdfFile(filePath));

  if (!sourceFiles.length) {
    return NextResponse.json(
      { message: `No PDF ${label} files were attached to the selected lessons.` },
      { status: 404 }
    );
  }

  const mergedPdf = await PDFDocument.create();

  for (const filePath of sourceFiles) {
    try {
      const bytes = await readFile(resolveStoredResourceFilePath(filePath));
      const sourcePdf = await PDFDocument.load(bytes);
      const pageIndexes = sourcePdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndexes);

      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    } catch {
      // Skip unreadable files so one bad file does not block the full pack.
    }
  }

  if (!mergedPdf.getPageCount()) {
    return NextResponse.json(
      { message: `Could not combine the selected ${label} PDFs.` },
      { status: 400 }
    );
  }

  const output = await mergedPdf.save();
  const lessonNumbers = orderedResources
    .map((resource) => resource.lesson_number)
    .filter((value): value is number => typeof value === "number")
    .join("-");
  const yearCode = year.replace(/\s+/g, "");
  const termCode = term.replace(/\s+/g, "");
  const fileName = `${yearCode}-${termCode}${lessonNumbers ? `-Lesson-${lessonNumbers}` : ""}-${label}.pdf`;

  return new NextResponse(new Uint8Array(output), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
