import { NextResponse } from "next/server";
import { z } from "zod";

import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { isCurrentUserOwner } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  password: z.string().refine(isStrongPassword, passwordRequirementText)
});

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const payload = schema.safeParse(await request.json());
  const { memberId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const isOwner = await isCurrentUserOwner();

  if (!payload.success) {
    return NextResponse.json(
      { message: passwordRequirementText },
      { status: 400 }
    );
  }

  if (!supabase || !adminSupabase) {
    return NextResponse.json(
      { message: "Supabase admin access is required for team password updates." },
      { status: 400 }
    );
  }

  if (!isOwner) {
    return NextResponse.json(
      { message: "Only the account owner can update team passwords." },
      { status: 403 }
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "You must be logged in." }, { status: 401 });
  }

  const { data: ownerMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const { data: targetMember } = await supabase
    .from("organization_members")
    .select("id, user_id, role, organization_id")
    .eq("id", memberId)
    .limit(1)
    .maybeSingle();

  if (!ownerMembership || !targetMember || ownerMembership.organization_id !== targetMember.organization_id) {
    return NextResponse.json({ message: "Team member not found." }, { status: 404 });
  }

  if (!targetMember.user_id || targetMember.user_id === user.id || targetMember.role === "owner") {
    return NextResponse.json(
      { message: "You cannot update your own owner password here." },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(targetMember.user_id, {
    password: payload.data.password
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Team member password updated." });
}
