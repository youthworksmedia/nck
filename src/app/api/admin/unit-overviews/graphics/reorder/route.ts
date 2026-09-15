import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1)
});

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ message: "Choose the unit files in the correct order." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const updates = await Promise.all(
    payload.data.orderedIds.map((id, index) =>
      adminSupabase
        .from("curriculum_unit_graphics")
        .update({
          display_order: index + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
    )
  );
  const error = updates.find((result) => result.error)?.error;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateTag("unit-overviews");
  revalidatePath("/resources");
  revalidatePath("/admin");

  return NextResponse.json({ message: "Unit files reordered." });
}
