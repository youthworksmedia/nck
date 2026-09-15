import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  curriculumSections,
  curriculumSectionStorageValues,
  curriculumYears,
  curriculumYearStorageValues,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isMissingColumn(errorMessage: string | undefined, column: string) {
  return Boolean(errorMessage?.includes(`'${column}' column`));
}

const schema = z.object({
  yearCycle: z.preprocess((value) => normalizeCurriculumYear(String(value ?? "")), z.enum(curriculumYears)),
  term: z.preprocess((value) => normalizeCurriculumSection(String(value ?? "")), z.enum(curriculumSections)),
  orderedIds: z.array(z.string().uuid()).min(1)
});

export async function POST(request: Request) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Could not reorder this lesson." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Admin content tools are not ready." }, { status: 400 });
  }

  const { data: matchingLessons, error: listError } = await adminSupabase
    .from("resources")
    .select("id")
    .in("year_cycle", curriculumYearStorageValues(payload.data.yearCycle))
    .in("term", curriculumSectionStorageValues(payload.data.term));

  if (listError) {
    return NextResponse.json({ message: listError.message }, { status: 400 });
  }

  const matchingIds = new Set((matchingLessons ?? []).map((lesson) => lesson.id));
  const allIdsMatch =
    payload.data.orderedIds.length === matchingIds.size &&
    payload.data.orderedIds.every((id) => matchingIds.has(id));

  if (!allIdsMatch) {
    return NextResponse.json(
      { message: "The lesson order did not match this term." },
      { status: 400 }
    );
  }

  const updates = payload.data.orderedIds.map((id, index) =>
    adminSupabase
      .from("resources")
      .update({ lesson_number: index + 1 })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const updateError = results.find((result) => result.error)?.error;

  if (isMissingColumn(updateError?.message, "lesson_number")) {
    return NextResponse.json(
      {
        message:
          "Lesson ordering needs the latest curriculum schema in Supabase before drag reordering can be saved."
      },
      { status: 400 }
    );
  }

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Lesson order updated." });
}
