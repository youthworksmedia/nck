import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminSupabase = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export async function deleteTeamMemberAccount(
  adminSupabase: AdminSupabase,
  member: {
    id: string;
    organization_id: string;
    user_id?: string | null;
  }
) {
  if (member.user_id) {
    const { count, error: countError } = await adminSupabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", member.user_id);

    if (countError) {
      return { error: countError };
    }

    if ((count ?? 0) <= 1) {
      const { error } = await adminSupabase.auth.admin.deleteUser(member.user_id);

      return { error };
    }
  }

  const { error } = await adminSupabase
    .from("organization_members")
    .delete()
    .eq("id", member.id)
    .eq("organization_id", member.organization_id);

  return { error };
}
