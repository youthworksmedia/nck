import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  visibleToAccountHolders: z.coerce.boolean().default(false),
  visibleToTeamMembers: z.coerce.boolean().default(false)
});

function revalidateFaqPages() {
  revalidatePath("/admin");
  revalidatePath("/help");
}

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    displayOrder: formData.get("displayOrder"),
    visibleToAccountHolders: formData.get("visibleToAccountHolders"),
    visibleToTeamMembers: formData.get("visibleToTeamMembers")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter a FAQ group title." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { error } = await adminSupabase.from("help_faq_sections").insert({
    title: payload.data.title,
    description: payload.data.description ?? "",
    display_order: payload.data.displayOrder,
    visible_to_account_holders: payload.data.visibleToAccountHolders,
    visible_to_team_members: payload.data.visibleToTeamMembers,
    published: true
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFaqPages();

  return NextResponse.json({ message: "FAQ group added." });
}
