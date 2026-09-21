import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentOrganizationMembership, isCurrentUserOwner } from "@/lib/portal";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteTeamMemberAccount } from "@/lib/team-member-deletion";
import { startTimer, withTiming } from "@/lib/timing";

const updateSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().trim().optional().default("")
});

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const timer = startTimer("route.handler", "PATCH /api/team-members/[memberId]");

  try {
    const { memberId } = await context.params;
    const payload = updateSchema.safeParse(await request.json());
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const [isOwner, { user, membership: currentMembership }] = await Promise.all([
      isCurrentUserOwner(),
      getCurrentOrganizationMembership()
    ]);

    if (!payload.success) {
      return NextResponse.json(
        { message: "Enter a name and a valid email address." },
        { status: 400 }
      );
    }

    if (!supabase || !adminSupabase) {
      return NextResponse.json(
        { message: "Supabase admin access is required for live member updates." },
        { status: 400 }
      );
    }

    if (!isOwner) {
      return NextResponse.json(
        { message: "Only the account owner can edit team member details." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
    }

    const { data: targetMember } = await withTiming("db.query", "organization_members.team_member_lookup", async () =>
      adminSupabase
        .from("organization_members")
        .select("*")
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

    const nextName = payload.data.name.trim();
    const nextEmail = payload.data.email.toLowerCase().trim();
    const nextPassword = payload.data.password.trim();

    if (nextPassword && !isStrongPassword(nextPassword)) {
      return NextResponse.json(
        { message: passwordRequirementText },
        { status: 400 }
      );
    }

    const membershipUpdate: Record<string, string> = {
      display_name: nextName,
      invitation_email: nextEmail
    };

    let membershipError: { message: string } | null = null;

    while (true) {
      const { error } = await adminSupabase
        .from("organization_members")
        .update(membershipUpdate)
        .eq("id", memberId);

      if (!error) {
        membershipError = null;
        break;
      }

      const missingColumn = error.message.match(/Could not find the '([^']+)' column/i)?.[1];

      if (missingColumn && missingColumn in membershipUpdate) {
        delete membershipUpdate[missingColumn];
        continue;
      }

      membershipError = error;
      break;
    }

    if (membershipError) {
      return NextResponse.json({ message: membershipError.message }, { status: 400 });
    }

    if (targetMember.user_id) {
      const currentName =
        typeof targetMember.display_name === "string" ? targetMember.display_name.trim() : "";
      const currentEmail =
        typeof targetMember.invitation_email === "string"
          ? targetMember.invitation_email.toLowerCase().trim()
          : "";
      const needsAuthEmailUpdate = nextEmail !== currentEmail;
      const needsAuthNameUpdate = nextName !== currentName;
      const needsAuthPasswordUpdate = Boolean(nextPassword);

      if (needsAuthEmailUpdate || needsAuthNameUpdate || needsAuthPasswordUpdate) {
        const authPayload: {
          email?: string;
          password?: string;
          user_metadata?: { full_name: string };
        } = {
          user_metadata: { full_name: nextName }
        };

        if (needsAuthEmailUpdate) {
          authPayload.email = nextEmail;
        }

        if (nextPassword) {
          authPayload.password = nextPassword;
        }

        const { error } = await adminSupabase.auth.admin.updateUserById(
          targetMember.user_id,
          authPayload
        );

        if (error) {
          return NextResponse.json({ message: error.message }, { status: 400 });
        }
      }
    }

    if (targetMember.role === "owner") {
      const { error } = await adminSupabase
        .from("organizations")
        .update({
          account_holder_name: nextName,
          owner_user_id: targetMember.user_id ?? null
        })
        .eq("id", targetMember.organization_id);

      if (error && !error.message.includes("'account_holder_name' column")) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ message: "Team member details updated." });
  } finally {
    console.timeEnd(timer);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const timer = startTimer("route.handler", "DELETE /api/team-members/[memberId]");

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
        { message: "Supabase admin access is required for live member deletion." },
        { status: 400 }
      );
    }

    if (!isOwner) {
      return NextResponse.json(
        { message: "Only the account owner can delete team members." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
    }

    const { data: targetMember } = await withTiming("db.query", "organization_members.team_member_delete_lookup", async () =>
      adminSupabase
        .from("organization_members")
        .select("id, user_id, role, organization_id")
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

    if (targetMember.user_id === user.id || targetMember.role === "owner") {
      return NextResponse.json(
        { message: "You cannot delete your own owner account." },
        { status: 400 }
      );
    }

    const { error } = await deleteTeamMemberAccount(adminSupabase, targetMember);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Team member removed." });
  } finally {
    console.timeEnd(timer);
  }
}
