import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(1)
});

type RouteContext = {
  params: Promise<{
    categoryId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Enter a category name." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin content changes." },
      { status: 400 }
    );
  }

  const { categoryId } = await context.params;
  const nextName = payload.data.name.trim();

  const { data: category, error: categoryError } = await adminSupabase
    .from("resource_categories")
    .update({ name: nextName })
    .eq("id", categoryId)
    .select("id, name")
    .limit(1)
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json(
      { message: categoryError?.message ?? "Category could not be updated." },
      { status: 400 }
    );
  }

  const { error: resourceError } = await adminSupabase
    .from("resources")
    .update({ category: category.name })
    .eq("category_id", category.id);

  if (resourceError) {
    return NextResponse.json({ message: resourceError.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Category updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin content changes." },
      { status: 400 }
    );
  }

  const { categoryId } = await context.params;

  const { error: resourceError } = await adminSupabase
    .from("resources")
    .update({
      category_id: null,
      category: "Uncategorized"
    })
    .eq("category_id", categoryId);

  if (resourceError) {
    return NextResponse.json({ message: resourceError.message }, { status: 400 });
  }

  const { error } = await adminSupabase.from("resource_categories").delete().eq("id", categoryId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Category deleted." });
}
