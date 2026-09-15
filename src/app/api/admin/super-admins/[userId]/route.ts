import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { getCurrentUser } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().trim().min(2),
  password: z
    .string()
    .optional()
    .refine((value) => !value || isStrongPassword(value), passwordRequirementText)
});

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Admin access required." }, { status: 401 });
  }

  const { userId } = await context.params;
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: `Enter a name. ${passwordRequirementText}` }, { status: 400 });
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

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: payload.data.name
    },
    ...(payload.data.password ? { password: payload.data.password } : {})
  });

  if (authError) {
    return NextResponse.json({ message: authError.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Admin account updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const [isAuthenticated, currentUser] = await Promise.all([
    isCurrentUserSuperAdmin(),
    getCurrentUser()
  ]);

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Admin access required." }, { status: 401 });
  }

  const { userId } = await context.params;

  if (currentUser?.id === userId) {
    return NextResponse.json({ message: "You cannot delete your own Admin account." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin account changes." },
      { status: 400 }
    );
  }

  const { error: roleError } = await adminSupabase
    .from("admin_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "super_admin");

  if (roleError) {
    return NextResponse.json({ message: roleError.message }, { status: 400 });
  }

  const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    return NextResponse.json({ message: deleteUserError.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Admin account deleted." });
}
