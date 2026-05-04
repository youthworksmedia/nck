import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureDemoOwnerBootstrap } from "@/lib/bootstrap";
import { getPlanByTier } from "@/lib/plans";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { hasSupabaseEnv } from "@/lib/public-env";
import { getCurrentUser, isCurrentUserOwner } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().refine(isStrongPassword, passwordRequirementText)
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const payload = schema.safeParse(await request.json());

  const memberEmail = payload.success ? payload.data.email.toLowerCase() : "";

  if (!payload.success) {
    return NextResponse.json(
      {
        message: `Enter a name, a valid email address, and a valid password. ${passwordRequirementText}`
      },
      { status: 400 }
    );
  }

  if (!supabase || !hasSupabaseEnv) {
    return NextResponse.json({
      message: `Team member created for ${memberEmail}.`
    });
  }

  const user = await getCurrentUser();
  const isOwner = await isCurrentUserOwner();

  if (!user) {
    return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
  }

  if (!isOwner) {
    return NextResponse.json(
      { message: "Only the account owner can invite team members." },
      { status: 403 }
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      {
        message:
          "Team member could not be created because SUPABASE_SERVICE_ROLE_KEY is missing."
      },
      { status: 200 }
    );
  }

  const bootstrapResult = await ensureDemoOwnerBootstrap(user);

  const { data: membership } = await adminSupabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  const organizationId = membership?.organization_id ?? bootstrapResult.organizationId;

  if (!organizationId) {
    return NextResponse.json(
      {
        message:
          bootstrapResult.error ??
          "The account holder setup is incomplete. Please sign out and sign in again."
      },
      { status: 400 }
    );
  }

  const { data: subscription } = await adminSupabase
    .from("subscriptions")
    .select("tier")
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  const plan = getPlanByTier(subscription?.tier ?? "");

  if (!plan) {
    return NextResponse.json(
      { message: "The current membership plan could not be verified." },
      { status: 400 }
    );
  }

  const { data: createdUser, error: createUserError } = await adminSupabase.auth.admin.createUser(
    {
      email: memberEmail,
      password: payload.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.data.name
      }
    }
  );

  let teamUserId = createdUser?.user?.id ?? null;

  if (createUserError || !teamUserId) {
    const isExistingUserError = createUserError?.message
      ?.toLowerCase()
      .includes("already been registered");

    if (!isExistingUserError) {
      return NextResponse.json(
        { message: createUserError?.message ?? "Unable to create team member." },
        { status: 400 }
      );
    }

    const { data: existingUsers, error: listUsersError } =
      await adminSupabase.auth.admin.listUsers();

    if (listUsersError) {
      return NextResponse.json({ message: listUsersError.message }, { status: 400 });
    }

    teamUserId =
      existingUsers.users.find(
        (candidate) => candidate.email?.toLowerCase() === memberEmail
      )?.id ?? null;

    if (!teamUserId) {
      return NextResponse.json(
        {
          message:
            "This email is already registered, but it could not be linked automatically. Ask that user to log in once, then try again."
        },
        { status: 400 }
      );
    }
  }

  const { error } = await adminSupabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: teamUserId,
    display_name: payload.data.name,
    invitation_email: memberEmail,
    role: "member"
  });

  if (error?.message?.includes("'display_name' column")) {
    const { error: retryError } = await adminSupabase.from("organization_members").insert({
      organization_id: organizationId,
      user_id: teamUserId,
      invitation_email: memberEmail,
      role: "member"
    });

    if (retryError) {
      if (createdUser?.user?.id) {
        await adminSupabase.auth.admin.deleteUser(createdUser.user.id);
      }
      return NextResponse.json({ message: retryError.message }, { status: 400 });
    }
  } else if (error) {
    if (createdUser?.user?.id) {
      await adminSupabase.auth.admin.deleteUser(createdUser.user.id);
    }
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: `Team member created for ${memberEmail}.`
  });
}
