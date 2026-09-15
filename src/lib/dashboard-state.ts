import { cache } from "react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationMembership } from "@/lib/portal";
import type { Resource } from "@/types";

export type DashboardStateSnapshot = {
  hasSeenDashboard: boolean;
  lastResource: Resource | null;
};

export const getDashboardStateSnapshot = cache(async function getDashboardStateSnapshot(
  resources: Resource[]
): Promise<DashboardStateSnapshot> {
  const [{ user, membership }, adminSupabase] = await Promise.all([
    getCurrentOrganizationMembership(),
    Promise.resolve(createSupabaseAdminClient())
  ]);

  if (!user?.id || !membership?.organization_id || !adminSupabase) {
    return {
      hasSeenDashboard: true,
      lastResource: null
    };
  }

  const { data, error } = await adminSupabase
    .from("dashboard_user_state")
    .select("dashboard_seen_at, last_resource_id")
    .eq("user_id", user.id)
    .eq("organization_id", membership.organization_id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      hasSeenDashboard: true,
      lastResource: null
    };
  }

  return {
    hasSeenDashboard: Boolean(data?.dashboard_seen_at),
    lastResource: resources.find((resource) => resource.id === data?.last_resource_id) ?? null
  };
});

export async function markDashboardSeen() {
  const { user, membership } = await getCurrentOrganizationMembership();
  const adminSupabase = createSupabaseAdminClient();

  if (!user?.id || !membership?.organization_id || !adminSupabase) {
    return;
  }

  await adminSupabase.from("dashboard_user_state").upsert(
    {
      user_id: user.id,
      organization_id: membership.organization_id,
      dashboard_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,organization_id" }
  );
}

export async function trackLastAccessedResource(resourceId: string) {
  const { user, membership } = await getCurrentOrganizationMembership();
  const adminSupabase = createSupabaseAdminClient();

  if (!user?.id || !membership?.organization_id || !adminSupabase) {
    return;
  }

  await adminSupabase.from("dashboard_user_state").upsert(
    {
      user_id: user.id,
      organization_id: membership.organization_id,
      last_resource_id: resourceId,
      last_resource_accessed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,organization_id" }
  );
}
