import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ cardId: string }>;
};

const schema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  badge: z.string().trim().optional(),
  meta: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateFamilyPages() {
  revalidateTag("family-resources");
  revalidatePath("/admin");
  revalidatePath("/family");
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
    badge: formData.get("badge"),
    meta: formData.get("meta"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter a family resource title." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { cardId } = await context.params;
  const { error } = await adminSupabase
    .from("family_resource_cards")
    .update({
      title: payload.data.title,
      description: payload.data.description ?? "",
      icon: payload.data.icon || "💬",
      badge: payload.data.badge ?? "",
      meta: payload.data.meta ?? "",
      display_order: payload.data.displayOrder,
      published: payload.data.status === "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", cardId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFamilyPages();

  return NextResponse.json({ message: "Family card saved." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { cardId } = await context.params;
  const { error } = await adminSupabase.from("family_resource_cards").delete().eq("id", cardId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFamilyPages();

  return NextResponse.json({ message: "Family card deleted." });
}
