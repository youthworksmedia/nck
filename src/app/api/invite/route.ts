import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureDemoOwnerBootstrap } from "@/lib/bootstrap";
import { hasSupabaseEnv, publicEnv } from "@/lib/public-env";
import { getCurrentUser, isCurrentUserOwner } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email()
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const payload = schema.safeParse(await request.json());

  const memberEmail = payload.success ? payload.data.email.toLowerCase() : "";

  if (!payload.success) {
    return NextResponse.json(
      {
        message: "Enter a valid email address."
      },
      { status: 400 }
    );
  }

  if (!supabase || !hasSupabaseEnv) {
    return NextResponse.json({
      message: `Invitation prepared for ${memberEmail}.`
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

  const { data: existingMember } = await adminSupabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("invitation_email", memberEmail)
    .limit(1)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({
      message: `${memberEmail} has already been invited to this account.`
    });
  }

  const { error } = await adminSupabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: null,
    display_name: memberEmail.split("@")[0],
    invitation_email: memberEmail,
    role: "member"
  });

  if (error?.message?.includes("'display_name' column")) {
    const { error: retryError } = await adminSupabase.from("organization_members").insert({
      organization_id: organizationId,
      user_id: null,
      invitation_email: memberEmail,
      role: "member"
    });

    if (retryError) {
      return NextResponse.json({ message: retryError.message }, { status: 400 });
    }
  } else if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    memberEmail,
    {
      redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`
    }
  );

  if (inviteError) {
    const alreadyRegistered = inviteError.message.toLowerCase().includes("already");

    if (!alreadyRegistered) {
      return NextResponse.json(
        {
          message: `The team member was added, but the invite email could not be sent: ${inviteError.message}`
        },
        { status: 202 }
      );
    }

    return NextResponse.json({
      message: `${memberEmail} was added. This email already has a login, so they can sign in or use Missing password.`
    });
  }

  return NextResponse.json({
    message: `Invitation sent to ${memberEmail}.`
  });
}
