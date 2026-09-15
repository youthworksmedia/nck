import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureDemoOwnerBootstrap } from "@/lib/bootstrap";
import { sendInviteEmail } from "@/lib/email-delivery";
import { formatEmailSender, getGeneralEmailSettings } from "@/lib/email-settings";
import { serverEnv } from "@/lib/env";
import { hasSupabaseEnv } from "@/lib/public-env";
import { getCurrentOrganizationMembership, isCurrentUserOwner } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startTimer, withTiming } from "@/lib/timing";

const schema = z.object({
  email: z.string().trim().email()
});

export async function POST(request: Request) {
  const timer = startTimer("route.handler", "POST /api/invite");

  try {
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

    const [{ user, membership: currentMembership }, isOwner] = await Promise.all([
      getCurrentOrganizationMembership(),
      isCurrentUserOwner()
    ]);

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

    const organizationId =
      currentMembership?.role === "owner"
        ? currentMembership.organization_id
        : bootstrapResult.organizationId;

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

    const generalSettings = await getGeneralEmailSettings();

    if (!serverEnv.resendApiKey || !formatEmailSender(generalSettings)) {
      return NextResponse.json(
        {
          message:
            "Invite email could not be sent because custom email delivery is not configured. Add RESEND_API_KEY and sender settings in Admin."
        },
        { status: 400 }
      );
    }

    const { data: existingMember } = await withTiming("db.query", "organization_members.invite_lookup", async () =>
      adminSupabase
        .from("organization_members")
        .select("id, user_id")
        .eq("organization_id", organizationId)
        .eq("invitation_email", memberEmail)
        .limit(1)
        .maybeSingle()
    );

    if (existingMember) {
      if (existingMember.user_id) {
        return NextResponse.json({
          message: `${memberEmail} is already active on this account.`
        });
      }
    } else {
      const { error } = await adminSupabase.from("organization_members").insert({
        organization_id: organizationId,
        user_id: null,
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
    }
    const redirectTo = `${generalSettings.siteUrl}/auth/callback?next=${encodeURIComponent("/create-account")}`;

    const { data: inviteLink, error: inviteLinkError } = await adminSupabase.auth.admin.generateLink({
      type: "invite",
      email: memberEmail,
      options: {
        redirectTo
      }
    });

    const actionUrl = inviteLink?.properties?.action_link;
    const hashedToken = inviteLink?.properties?.hashed_token;

    if (!inviteLinkError && actionUrl && hashedToken) {
    const emailUrl = `${generalSettings.siteUrl}/create-account?token_hash=${encodeURIComponent(hashedToken)}&type=invite`;
    const inviteEmail = await sendInviteEmail({
      to: memberEmail,
      actionUrl,
      emailUrl
    });

    if (inviteEmail.ok) {
      return NextResponse.json({
        message: existingMember
          ? `Invitation resent to ${memberEmail}.`
          : `Invitation sent to ${memberEmail}.`
      });
    }

    return NextResponse.json(
      {
        message: inviteEmail.skipped
          ? "Invite email could not be sent because custom email delivery is not configured. Add RESEND_API_KEY and sender settings in Admin."
          : inviteEmail.message
      },
      { status: 400 }
    );
  }

    const { data: authUsers, error: authUsersError } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (authUsersError) {
      return NextResponse.json({ message: authUsersError.message }, { status: 400 });
    }

    const existingAuthUser = authUsers.users.find(
      (entry) => entry.email?.toLowerCase() === memberEmail
    );

    if (existingAuthUser?.id && existingAuthUser.email_confirmed_at) {
    const { error: claimError } = await adminSupabase
      .from("organization_members")
      .update({
        user_id: existingAuthUser.id
      })
      .eq("organization_id", organizationId)
      .eq("invitation_email", memberEmail);

    if (claimError && !claimError.message?.includes("'display_name' column")) {
      return NextResponse.json({ message: claimError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: `${memberEmail} already has an active account on this ministry team.`
    });
  }

    return NextResponse.json(
      {
        message: inviteLinkError?.message || "A secure invite link could not be created."
      },
      { status: 400 }
    );
  } finally {
    console.timeEnd(timer);
  }
}
