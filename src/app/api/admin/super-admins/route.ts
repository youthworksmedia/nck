import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().refine(isStrongPassword, passwordRequirementText)
});

export async function POST(request: Request) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { message: `Enter a name, a valid email, and a valid password. ${passwordRequirementText}` },
      { status: 400 }
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for admin account changes." },
      { status: 400 }
    );
  }

  const email = payload.data.email.toLowerCase();

  const { data: existingUsers, error: listUsersError } = await adminSupabase.auth.admin.listUsers();

  if (listUsersError) {
    return NextResponse.json({ message: listUsersError.message }, { status: 400 });
  }

  let userId =
    existingUsers.users.find((candidate) => candidate.email?.toLowerCase() === email)?.id ?? null;

  if (!userId) {
    const { data: createdUser, error: createUserError } = await adminSupabase.auth.admin.createUser(
      {
        email,
        password: payload.data.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.data.name
        }
      }
    );

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        { message: createUserError?.message ?? "Unable to create super admin account." },
        { status: 400 }
      );
    }

    userId = createdUser.user.id;
  }

  const { error } = await adminSupabase.from("admin_roles").upsert({
    user_id: userId,
    email,
    display_name: payload.data.name,
    role: "super_admin"
  });

  if (error?.message?.includes("'display_name' column")) {
    const { error: retryError } = await adminSupabase.from("admin_roles").upsert({
      user_id: userId,
      email,
      role: "super_admin"
    });

    if (retryError) {
      return NextResponse.json({ message: retryError.message }, { status: 400 });
    }
  } else if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: `Super admin access added for ${email}.` });
}
