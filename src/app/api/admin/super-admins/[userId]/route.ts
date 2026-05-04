import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().trim().min(2)
});

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const { userId } = await context.params;
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Enter a name." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin account changes." },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase
    .from("admin_roles")
    .update({ display_name: payload.data.name })
    .eq("user_id", userId)
    .eq("role", "super_admin");

  if (error?.message?.includes("'display_name' column")) {
    return NextResponse.json(
      { message: "Please update the database schema to include the new name field." },
      { status: 400 }
    );
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Super admin name updated." });
}
