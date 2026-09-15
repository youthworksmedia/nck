import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ sectionId: string }>;
};

const schema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateResourcePages() {
  revalidatePath("/admin");
  revalidatePath("/account/resources");
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter a section title." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { sectionId } = await context.params;
  const { error } = await adminSupabase
    .from("ministry_leader_resource_sections")
    .update({
      title: payload.data.title,
      description: payload.data.description ?? "",
      display_order: payload.data.displayOrder,
      published: payload.data.status === "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", sectionId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateResourcePages();

  return NextResponse.json({ message: "Section saved." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { sectionId } = await context.params;
  const { error } = await adminSupabase
    .from("ministry_leader_resource_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateResourcePages();

  return NextResponse.json({ message: "Section deleted." });
}
