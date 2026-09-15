import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAIL = "robert.moller@youthworks.net";
const SUPER_ADMIN_PASSWORD = "Youthworks123";

export function getSuperAdminResetCredentials() {
  return {
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD
  };
}

export async function resetSuperAdminPassword() {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is missing."
    };
  }

  const { data: existingUsers, error: listUsersError } =
    await adminSupabase.auth.admin.listUsers();

  if (listUsersError) {
    return {
      ok: false,
      message: listUsersError.message
    };
  }

  let userId =
    existingUsers.users.find(
      (candidate) => candidate.email?.toLowerCase() === SUPER_ADMIN_EMAIL
    )?.id ?? null;

  if (!userId) {
    const { data: createdUser, error: createUserError } =
      await adminSupabase.auth.admin.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        email_confirm: true
      });

    if (createUserError || !createdUser.user) {
      return {
        ok: false,
        message: createUserError?.message ?? "Unable to create the super admin account."
      };
    }

    userId = createdUser.user.id;
  } else {
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: SUPER_ADMIN_PASSWORD
    });

    if (updateError) {
      return {
        ok: false,
        message: updateError.message
      };
    }
  }

  const { error: roleError } = await adminSupabase.from("admin_roles").upsert({
    user_id: userId,
    email: SUPER_ADMIN_EMAIL,
    role: "super_admin"
  });

  if (roleError) {
    if (roleError.message.includes("nck.admin_roles") || roleError.message.includes("public.admin_roles")) {
      return {
        ok: false,
        message:
          "The admin setup is incomplete. Run the NCK database migrations in Supabase first, then try reset again."
      };
    }

    return {
      ok: false,
      message: roleError.message
    };
  }

  return {
    ok: true,
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD
  };
}
