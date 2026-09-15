import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  term: z.coerce.number().int().min(1).max(6),
  orderedIds: z.array(z.string().min(1)).min(1)
});

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Choose family lessons to reorder." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { data: matchingLessons, error: listError } = await adminSupabase
    .from("family_resource_lessons")
    .select("id")
    .eq("term", payload.data.term);

  if (listError) {
    return NextResponse.json({ message: listError.message }, { status: 400 });
  }

  const matchingIds = new Set((matchingLessons ?? []).map((lesson) => lesson.id));
  const allIdsMatch =
    payload.data.orderedIds.length === matchingIds.size &&
    payload.data.orderedIds.every((id) => matchingIds.has(id));

  if (!allIdsMatch) {
    return NextResponse.json({ message: "The lesson order did not match this unit." }, { status: 400 });
  }

  const results = await Promise.all(
    payload.data.orderedIds.map((id, index) =>
      adminSupabase
        .from("family_resource_lessons")
        .update({ display_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", id)
    )
  );
  const updateError = results.find((result) => result.error)?.error;

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 });
  }

  revalidatePath("/admin");
  revalidatePath("/family");

  return NextResponse.json({ message: "Family lessons reordered." });
}
