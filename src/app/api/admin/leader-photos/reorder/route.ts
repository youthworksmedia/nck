import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { leaderPhotosSectionId } from "@/lib/photo-library";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1)
});

function revalidatePhotos() {
  revalidateTag("photo-library");
  revalidateTag("leader-resources");
  revalidatePath("/admin");
  revalidatePath("/leaders");
  revalidatePath("/leaders/photos");
}

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ message: "Choose photos to reorder." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const updates = payload.data.orderedIds.map((id, index) =>
    adminSupabase
      .from("leader_resource_items")
      .update({ display_order: index + 1, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("section_id", leaderPhotosSectionId)
  );
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidatePhotos();

  return NextResponse.json({ message: "Photos reordered." });
}
