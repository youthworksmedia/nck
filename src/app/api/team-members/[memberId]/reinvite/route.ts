import { NextResponse } from "next/server";

import { sendInviteEmail } from "@/lib/email-delivery";
import { formatEmailSender, getGeneralEmailSettings } from "@/lib/email-settings";
import { serverEnv } from "@/lib/env";
import { getCurrentOrganizationMembership, isCurrentUserOwner } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startTimer, withTiming } from "@/lib/timing";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const timer = startTimer("route.handler", "POST /api/team-members/[memberId]/reinvite");

  try {
    const { memberId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const [isOwner, { user, membership: currentMembership }] = await Promise.all([
      isCurrentUserOwner(),
      getCurrentOrganizationMembership()
    ]);

    if (!supabase || !adminSupabase) {
      return NextResponse.json(
        { message: "Supabase admin access is required for live member invites." },
        { status: 400 }
      );
    }

    if (!isOwner) {
      return NextResponse.json(
        { message: "Only the account owner can reinvite team members." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
    }

    const { data: targetMember } = await withTiming("db.query", "organization_members.team_member_reinvite_lookup", async () =>
      adminSupabase
        .from("organization_members")
        .select("id, user_id, role, organization_id, invitation_email")
        .eq("id", memberId)
        .limit(1)
        .maybeSingle()
    );

    if (
      currentMembership?.role !== "owner" ||
      !targetMember ||
      currentMembership.organization_id !== targetMember.organization_id
    ) {
      return NextResponse.json({ message: "Team member not found." }, { status: 404 });
    }

    if (targetMember.role === "owner") {
      return NextResponse.json(
        { message: "Account holders cannot be reinvited from this action." },
        { status: 400 }
      );
    }

    if (targetMember.user_id) {
      return NextResponse.json(
        { message: "This team member already has an active account." },
        { status: 400 }
      );
    }

    const memberEmail =
      typeof targetMember.invitation_email === "string"
        ? targetMember.invitation_email.toLowerCase().trim()
        : "";

    if (!memberEmail) {
      return NextResponse.json(
        { message: "This invited team member does not have an email address." },
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

    if (inviteLinkError || !actionUrl || !hashedToken) {
      return NextResponse.json(
        {
          message: inviteLinkError?.message || "A secure invite link could not be created."
        },
        { status: 400 }
      );
    }

    const emailUrl = `${generalSettings.siteUrl}/create-account?token_hash=${encodeURIComponent(hashedToken)}&type=invite`;
    const inviteEmail = await sendInviteEmail({
      to: memberEmail,
      actionUrl,
      emailUrl
    });

    if (!inviteEmail.ok) {
      return NextResponse.json(
        {
          message: inviteEmail.skipped
            ? "Invite email could not be sent because custom email delivery is not configured. Add RESEND_API_KEY and sender settings in Admin."
            : inviteEmail.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Invitation resent to ${memberEmail}.`
    });
  } finally {
    console.timeEnd(timer);
  }
}
