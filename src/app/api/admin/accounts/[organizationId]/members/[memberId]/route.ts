import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    organizationId: string;
    memberId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Admin access required." }, { status: 401 });
  }

  const { organizationId, memberId } = await context.params;
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for account changes." },
      { status: 400 }
    );
  }

  const { data: targetMember, error: lookupError } = await adminSupabase
    .from("organization_members")
    .select("id, role, organization_id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ message: lookupError.message }, { status: 400 });
  }

  if (!targetMember) {
    return NextResponse.json({ message: "Sub account not found." }, { status: 404 });
  }

  if (targetMember.role === "owner") {
    return NextResponse.json(
      { message: "Account holders cannot be deleted from the sub accounts list." },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .neq("role", "owner");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidatePath("/admin");

  return NextResponse.json({ message: "Sub account deleted." });
}
