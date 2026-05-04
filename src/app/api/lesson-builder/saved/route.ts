import { NextResponse } from "next/server";
import { z } from "zod";

import { getLessonBuilderRouteAccess } from "@/lib/lesson-builder-access";
import { lessonBuilderInputSchema, lessonPlanSchema } from "@/lib/lesson-builder";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.string().uuid().optional(),
  isShared: z.boolean().default(false),
  input: lessonBuilderInputSchema,
  lesson: lessonPlanSchema
});

export async function POST(request: Request) {
  const [supabase, adminSupabase, access] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
    getLessonBuilderRouteAccess()
  ]);

  const writeClient = adminSupabase ?? supabase;

  if (!writeClient || !access.allowed || !access.user || !access.organizationId) {
    return NextResponse.json(
      { message: "Only active Big plan account holders and team members can save lessons." },
      { status: 403 }
    );
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Could not save this lesson." }, { status: 400 });
  }

  const values = {
    user_id: access.user.id,
    organization_id: access.organizationId,
    title: payload.data.lesson.title,
    passage: payload.data.input.passage,
    age_group: payload.data.input.ageGroup,
    lesson_length: payload.data.input.lessonLength,
    learning_goal: payload.data.input.learningGoal,
    created_by_email: access.user.email ?? "team-member@example.com",
    is_shared: payload.data.isShared,
    lesson_data: payload.data.lesson,
    updated_at: new Date().toISOString()
  };

  const query = payload.data.id
    ? writeClient.from("lesson_plans").update(values).eq("id", payload.data.id).eq("user_id", access.user.id)
    : writeClient.from("lesson_plans").insert(values);

  const { error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: payload.data.id ? "Lesson updated." : "Lesson saved."
  });
}
