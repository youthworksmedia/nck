import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { curriculumSections, curriculumYears, normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  yearCycle: z.preprocess((value) => normalizeCurriculumYear(String(value ?? "")), z.enum(curriculumYears)),
  term: z.preprocess((value) => normalizeCurriculumSection(String(value ?? "")), z.enum(curriculumSections)),
  content: z.string()
});

export async function POST(request: Request) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Enter the term details correctly." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin content changes." },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase.from("curriculum_term_notes").upsert(
    {
      year_cycle: payload.data.yearCycle,
      term: payload.data.term,
      content: payload.data.content,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "year_cycle,term"
    }
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Term information updated." });
}
