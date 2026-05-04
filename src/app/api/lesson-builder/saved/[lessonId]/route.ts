import { NextResponse } from "next/server";

import { getLessonBuilderRouteAccess } from "@/lib/lesson-builder-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    lessonId: string;
  }>;
};

export async function DELETE(_: Request, { params }: Props) {
  const [{ lessonId }, supabase, adminSupabase, access] = await Promise.all([
    params,
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
    getLessonBuilderRouteAccess()
  ]);

  const writeClient = adminSupabase ?? supabase;

  if (!writeClient || !access.allowed || !access.user) {
    return NextResponse.json(
      { message: "Only active Big plan account holders and team members can delete lessons." },
      { status: 403 }
    );
  }

  const { error } = await writeClient
    .from("lesson_plans")
    .delete()
    .eq("id", lessonId)
    .eq("user_id", access.user.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Lesson deleted." });
}
