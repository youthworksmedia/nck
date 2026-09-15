import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addYears, formatISO, formatShortDate } from "@/lib/time";
import {
  demoCheckoutProfile,
  demoMembership,
  demoOwnerEmail,
  demoOwnerEmails,
  demoResources,
  demoTermNotes,
  demoTeamMembers
} from "@/lib/demo-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isCurrentCurriculumSection,
  isCurrentCurriculumYear,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import { hasSupabaseEnv } from "@/lib/public-env";
import { getCachedPublicResources, getSampleResourceFromPublishedResources } from "@/lib/portal-resource-data";
import { getRequestSupabaseAuth } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withTiming } from "@/lib/timing";
import type {
  AccountEngagementMetrics,
  CheckoutProfile,
  CurriculumTermNote,
  MembershipSnapshot,
  PurchaseOrderSummary,
  Resource,
  TeamMember
} from "@/types";

const inactiveMembership: MembershipSnapshot = {
  organizationName: "No active membership",
  churchName: "No church set",
  accountHolderName: "",
  planTier: "essential",
  subscriptionStatus: "inactive",
  renewalDate: "-",
  cancelAtPeriodEnd: false,
  memberCount: 0
};

function normalizeOrganizationName(name?: string | null) {
  if (!name) {
    return "New Creation Kids";
  }

  return name;
}

function isDemoOwnerEmail(email?: string | null) {
  return email ? demoOwnerEmails.some((entry) => entry.toLowerCase() === email.toLowerCase()) : false;
}

function fallbackPersonName(email?: string | null, role?: "owner" | "member") {
  if (!email) {
    return role === "owner" ? "Account holder" : "Team member";
  }

  return email.split("@")[0];
}

type AuthUserLookup = {
  id?: string;
  email?: string;
  fullName?: string;
  lastSignInAt?: string;
};

async function getOrganizationAuthUserLookup(userIds: string[]) {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase || userIds.length === 0) {
    return new Map<string, AuthUserLookup>();
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const results = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const { data, error } = await adminSupabase.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return null;
      }

      return [
        userId,
        {
          id: data.user.id,
          email: data.user.email,
          fullName:
            typeof data.user.user_metadata?.full_name === "string"
              ? data.user.user_metadata.full_name
              : undefined,
          lastSignInAt: data.user.last_sign_in_at ?? undefined
        }
      ] as const;
    })
  );

  const entries: Array<[string, AuthUserLookup]> = results
    .filter((entry): entry is NonNullable<(typeof results)[number]> => entry !== null)
    .map((entry) => [entry[0], entry[1]]);

  return new Map(entries);
}

async function getMembershipRowsForUser(options: {
  client: SupabaseClient<any, "public", any>;
  userId: string;
  normalizedEmail: string;
}) {
  const rows: Array<{
    id?: string;
    organization_id: string;
    role: "owner" | "member";
    user_id?: string | null;
    invitation_email?: string | null;
    display_name?: string | null;
  }> = [];

  const { data: byUserId } = await withTiming("db.query", "organization_members.by_user_id", async () =>
    options.client
      .from("organization_members")
      .select("id, organization_id, role, user_id, invitation_email, display_name")
      .eq("user_id", options.userId)
      .limit(10)
  );

  if (byUserId?.length) {
    rows.push(...byUserId);
    return rows;
  }

  const { data: byInvitationEmail } = await withTiming(
    "db.query",
    "organization_members.by_invitation_email",
    async () =>
      options.client
        .from("organization_members")
        .select("id, organization_id, role, user_id, invitation_email, display_name")
        .eq("invitation_email", options.normalizedEmail)
        .limit(10)
  );

  if (byInvitationEmail?.length) {
    rows.push(
      ...byInvitationEmail.filter(
        (candidate) => !rows.some((existing) => existing.id === candidate.id)
      )
    );
  }

  return rows;
}

const getOrganizationMembershipRow = cache(async function getOrganizationMembershipRow() {
  const { supabase, user } = await getRequestSupabaseAuth();
  const adminSupabase = createSupabaseAdminClient();

  if (!supabase || !hasSupabaseEnv || !user?.email) {
    return {
      supabase,
      user,
      membership: null as null | {
        id?: string;
        organization_id: string;
        role: "owner" | "member";
        user_id?: string | null;
        invitation_email?: string | null;
        display_name?: string | null;
      }
    };
  }

  const normalizedEmail = user.email.toLowerCase();
  const membershipClient = adminSupabase ?? supabase;
  const rows = await withTiming("db.query", "organization_members.resolve_membership", async () =>
    getMembershipRowsForUser({
      client: membershipClient,
      userId: user.id,
      normalizedEmail
    })
  );

  const bestMatch =
    rows?.find((membership) => membership.user_id === user.id) ??
    rows?.find((membership) => membership.invitation_email?.toLowerCase() === normalizedEmail) ??
    null;

  return {
    supabase,
    user,
    membership: bestMatch
      ? {
          id: bestMatch.id,
          organization_id: bestMatch.organization_id,
          role: bestMatch.role === "owner" ? "owner" : "member",
          user_id: bestMatch.user_id,
          invitation_email: bestMatch.invitation_email,
          display_name: bestMatch.display_name
        }
      : null
  };
});

export async function getCurrentOrganizationMembership() {
  const { user, membership } = await getOrganizationMembershipRow();

  return {
    user,
    membership
  };
}

type MemberAccessSnapshot = {
  displayName: string | null;
  churchName: string;
  hasActiveAccount: boolean;
  isOwner: boolean;
  isSuperAdmin: boolean;
  membershipRole: "owner" | "member" | null;
  accountHolderName?: string | null;
  planTier: MembershipSnapshot["planTier"];
  renewalDate: MembershipSnapshot["renewalDate"];
  subscriptionStatus: MembershipSnapshot["subscriptionStatus"];
  user: Awaited<ReturnType<typeof getCurrentUser>>;
};

function mapTeamMembersWithFallbacks(
  members: Array<Record<string, unknown>>,
  authUserLookup: Map<string, AuthUserLookup>
): TeamMember[] {
  const sortedMembers = [...members].sort((left, right) => {
    const leftRole = left.role === "owner" ? 0 : 1;
    const rightRole = right.role === "owner" ? 0 : 1;

    if (leftRole !== rightRole) {
      return leftRole - rightRole;
    }

    const leftJoinedAt =
      typeof left.joined_at === "string"
        ? new Date(left.joined_at).getTime()
        : Number.POSITIVE_INFINITY;
    const rightJoinedAt =
      typeof right.joined_at === "string"
        ? new Date(right.joined_at).getTime()
        : Number.POSITIVE_INFINITY;

    if (leftJoinedAt !== rightJoinedAt) {
      return leftJoinedAt - rightJoinedAt;
    }

    const leftEmail =
      typeof left.invitation_email === "string" ? left.invitation_email.toLowerCase() : "";
    const rightEmail =
      typeof right.invitation_email === "string" ? right.invitation_email.toLowerCase() : "";

    return leftEmail.localeCompare(rightEmail);
  });

  return sortedMembers.map((member) => {
    const userId = typeof member.user_id === "string" ? member.user_id : null;
    const invitationEmail =
      typeof member.invitation_email === "string" ? member.invitation_email : null;
    const authUser = userId ? authUserLookup.get(userId) : undefined;
    const role = member.role === "owner" ? "owner" : "member";
    const fallbackName =
      role === "member" && invitationEmail
        ? invitationEmail
        : fallbackPersonName(invitationEmail ?? authUser?.email, role);

    return {
      id: typeof member.id === "string" ? member.id : "",
      userId,
      name:
        (typeof member.display_name === "string" && member.display_name.trim()) ||
        authUser?.fullName ||
        fallbackName,
      email: invitationEmail ?? authUser?.email ?? "pending@example.com",
      role,
      status: userId ? "active" : "invited",
      joinedAt: formatShortDate(
        typeof member.joined_at === "string"
          ? member.joined_at
          : formatISO(addYears(new Date(), -1))
      )
    };
  });
}

export const getCurrentUser = cache(async function getCurrentUser() {
  const { supabase, user } = await getRequestSupabaseAuth();

  if (!supabase) {
    return {
      id: "demo-user",
      email: demoOwnerEmail
    };
  }

  return user;
});

export const isCurrentUserOwner = cache(async function isCurrentUserOwner() {
  const { supabase, user, membership } = await getOrganizationMembershipRow();

  if (!user) {
    return false;
  }

  if (!supabase || !hasSupabaseEnv) {
    return isDemoOwnerEmail(user.email);
  }

  if (membership?.role) {
    return membership.role === "owner";
  }

  return false;
});

export const isCurrentUserTeamMember = cache(async function isCurrentUserTeamMember() {
  const { supabase, user, membership } = await getOrganizationMembershipRow();

  if (!user || !supabase || !hasSupabaseEnv) {
    return false;
  }

  return membership?.role === "member";
});

export const getMembershipSnapshot = cache(async function getMembershipSnapshot(): Promise<MembershipSnapshot> {
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();
  const adminSupabase = createSupabaseAdminClient();

  if (!supabase || !hasSupabaseEnv) {
    return user && isDemoOwnerEmail(user.email) ? demoMembership : inactiveMembership;
  }

  if (!user) {
    return inactiveMembership;
  }

  if (!memberRow?.organization_id) {
    return inactiveMembership;
  }

  const membershipClient = adminSupabase ?? supabase;
  const [
    { data: organization },
    { data: subscription },
    { count: memberCount },
    { data: ownerRow },
    { data: latestOrder }
  ] = await withTiming("db.query", "membership_snapshot", async () =>
    Promise.all([
      membershipClient
        .from("organizations")
        .select("name, church_name, account_holder_name")
        .eq("id", memberRow.organization_id)
        .limit(1)
        .maybeSingle(),
      membershipClient
        .from("subscriptions")
        .select("status, tier, current_period_end, cancel_at_period_end")
        .eq("organization_id", memberRow.organization_id)
        .limit(1)
        .maybeSingle(),
      membershipClient
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", memberRow.organization_id),
      membershipClient
        .from("organization_members")
        .select("display_name, invitation_email")
        .eq("organization_id", memberRow.organization_id)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle(),
      membershipClient
        .from("purchase_orders")
        .select("account_holder_name, church_name, plan_tier")
        .eq("organization_id", memberRow.organization_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ])
  );

  if (!organization || !subscription) {
    return inactiveMembership;
  }

  return {
    organizationName: normalizeOrganizationName(organization.name),
    churchName: normalizeOrganizationName(
      latestOrder?.church_name ?? organization.church_name ?? organization.name
    ),
    accountHolderName:
      ownerRow?.display_name ??
      organization.account_holder_name ??
      latestOrder?.account_holder_name ??
      fallbackPersonName(ownerRow?.invitation_email, "owner"),
    planTier: subscription.tier ?? latestOrder?.plan_tier,
    subscriptionStatus: subscription.status,
    renewalDate: subscription.current_period_end,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    memberCount: memberCount ?? 0
  };
});

export const getMembershipShellSnapshot = cache(async function getMembershipShellSnapshot() {
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();
  const adminSupabase = createSupabaseAdminClient();

  if (!supabase || !hasSupabaseEnv) {
    return user && isDemoOwnerEmail(user.email)
      ? {
          churchName: demoMembership.churchName,
          planTier: demoMembership.planTier,
          subscriptionStatus: demoMembership.subscriptionStatus
        }
      : {
          churchName: inactiveMembership.churchName,
          planTier: inactiveMembership.planTier,
          subscriptionStatus: inactiveMembership.subscriptionStatus
        };
  }

  if (!user || !memberRow?.organization_id) {
    return {
      churchName: inactiveMembership.churchName,
      planTier: inactiveMembership.planTier,
      subscriptionStatus: inactiveMembership.subscriptionStatus
    };
  }

  const membershipClient = adminSupabase ?? supabase;
  const [{ data: organization }, { data: subscription }] = await withTiming(
    "db.query",
    "membership_shell_snapshot",
    async () =>
      Promise.all([
        membershipClient
          .from("organizations")
          .select("name, church_name")
          .eq("id", memberRow.organization_id)
          .limit(1)
          .maybeSingle(),
        membershipClient
          .from("subscriptions")
          .select("status, tier")
          .eq("organization_id", memberRow.organization_id)
          .limit(1)
          .maybeSingle()
      ])
  );

  return {
    churchName: normalizeOrganizationName(organization?.church_name ?? organization?.name),
    planTier: subscription?.tier ?? inactiveMembership.planTier,
    subscriptionStatus: subscription?.status ?? inactiveMembership.subscriptionStatus
  };
});

export const getMemberAccessSnapshot = cache(async function getMemberAccessSnapshot(): Promise<MemberAccessSnapshot> {
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();
  const adminSupabase = createSupabaseAdminClient();

  if (!supabase || !hasSupabaseEnv) {
    const hasDemoAccess = Boolean(user?.email && isDemoOwnerEmail(user.email));

    return {
      user,
      displayName: null,
      churchName: hasDemoAccess ? demoMembership.churchName : inactiveMembership.churchName,
      planTier: hasDemoAccess ? demoMembership.planTier : inactiveMembership.planTier,
      subscriptionStatus: hasDemoAccess
        ? demoMembership.subscriptionStatus
        : inactiveMembership.subscriptionStatus,
      renewalDate: hasDemoAccess ? demoMembership.renewalDate : inactiveMembership.renewalDate,
      hasActiveAccount: hasDemoAccess,
      isOwner: hasDemoAccess,
      isSuperAdmin: false,
      membershipRole: hasDemoAccess ? "owner" : null,
      accountHolderName: hasDemoAccess ? demoMembership.accountHolderName : null
    };
  }

  if (!user) {
    return {
      user: null,
      displayName: null,
      churchName: inactiveMembership.churchName,
      planTier: inactiveMembership.planTier,
      subscriptionStatus: inactiveMembership.subscriptionStatus,
      renewalDate: inactiveMembership.renewalDate,
      hasActiveAccount: false,
      isOwner: false,
      isSuperAdmin: false,
      membershipRole: null,
      accountHolderName: null
    };
  }

  if (!memberRow?.organization_id) {
    const superAdminData = adminSupabase
      ? await withTiming("db.query", "member_access_snapshot.super_admin", async () =>
          adminSupabase
            .from("admin_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "super_admin")
            .limit(1)
            .maybeSingle()
        )
      : { data: null };

    return {
      user,
      displayName: null,
      churchName: inactiveMembership.churchName,
      planTier: inactiveMembership.planTier,
      subscriptionStatus: inactiveMembership.subscriptionStatus,
      renewalDate: inactiveMembership.renewalDate,
      hasActiveAccount: Boolean(superAdminData.data),
      isOwner: false,
      isSuperAdmin: Boolean(superAdminData.data),
      membershipRole: null,
      accountHolderName: null
    };
  }

  const membershipClient = adminSupabase ?? supabase;
  const [{ data: superAdminRow }, { data: organization }, { data: subscription }, { data: ownerRow }] = await withTiming(
    "db.query",
    "member_access_snapshot",
    async () =>
      Promise.all([
        adminSupabase
          ? adminSupabase
              .from("admin_roles")
              .select("role")
              .eq("user_id", user.id)
              .eq("role", "super_admin")
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        membershipClient
          .from("organizations")
          .select("name, church_name, account_holder_name")
          .eq("id", memberRow.organization_id)
          .limit(1)
          .maybeSingle(),
        membershipClient
          .from("subscriptions")
          .select("status, tier, current_period_end")
          .eq("organization_id", memberRow.organization_id)
          .limit(1)
          .maybeSingle(),
        membershipClient
          .from("organization_members")
          .select("display_name, invitation_email")
          .eq("organization_id", memberRow.organization_id)
          .eq("role", "owner")
          .limit(1)
          .maybeSingle()
      ])
  );

  const subscriptionStatus = subscription?.status ?? inactiveMembership.subscriptionStatus;
  const isSuperAdmin = Boolean(superAdminRow);
  const hasActiveAccount =
    isSuperAdmin || subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const membershipRole = memberRow.role === "owner" ? "owner" : "member";

  return {
    user,
    displayName: memberRow.display_name ?? null,
    churchName: normalizeOrganizationName(organization?.church_name ?? organization?.name),
    planTier: subscription?.tier ?? inactiveMembership.planTier,
    renewalDate: subscription?.current_period_end ?? inactiveMembership.renewalDate,
    subscriptionStatus,
    hasActiveAccount,
    isOwner: membershipRole === "owner",
    isSuperAdmin,
    membershipRole,
    accountHolderName:
      organization?.account_holder_name ??
      ownerRow?.display_name ??
      fallbackPersonName(ownerRow?.invitation_email, "owner")
  };
});

export async function getResources(): Promise<Resource[]> {
  if (!hasSupabaseEnv) {
    const { user } = await getCurrentOrganizationMembership();
    return user && isDemoOwnerEmail(user.email) ? demoResources : [];
  }

  return getCachedPublicResources();
}

export async function getSampleResource(): Promise<Resource | null> {
  return getSampleResourceFromPublishedResources();
}

export async function getCurriculumTermNotes(): Promise<CurriculumTermNote[]> {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const { user } = await getCurrentOrganizationMembership();

  if (!supabase || !hasSupabaseEnv) {
    return user && isDemoOwnerEmail(user.email) ? demoTermNotes : [];
  }

  const notesClient = adminSupabase ?? supabase;

  const { data, error } = await withTiming("db.query", "curriculum_term_notes", async () =>
    notesClient
      .from("curriculum_term_notes")
      .select("year_cycle, term, content")
      .order("year_cycle", { ascending: true })
      .order("term", { ascending: true })
  );

  if (error || !data?.length) {
    return [];
  }

  const notesBySection = new Map<
    string,
    { note: CurriculumTermNote; priority: number }
  >();

  (data ?? []).forEach((note) => {
    const yearCycle = normalizeCurriculumYear(note.year_cycle);
    const term = normalizeCurriculumSection(note.term);
    const key = `${yearCycle}::${term}`;
    const priority =
      (isCurrentCurriculumYear(note.year_cycle) ? 2 : 0) +
      (isCurrentCurriculumSection(note.term) ? 1 : 0);
    const current = notesBySection.get(key);

    if (!current || priority >= current.priority) {
      notesBySection.set(key, {
        priority,
        note: {
          yearCycle,
          term,
          content: note.content ?? ""
        }
      });
    }
  });

  return Array.from(notesBySection.values()).map((entry) => entry.note);
}

export const getTeamMembers = cache(async function getTeamMembers(): Promise<TeamMember[]> {
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();

  if (!supabase || !hasSupabaseEnv) {
    return user && isDemoOwnerEmail(user.email) ? demoTeamMembers : [];
  }

  if (!user) {
    return [];
  }

  if (!memberRow) {
    return [];
  }

  const adminSupabase = createSupabaseAdminClient();
  const membersClient = adminSupabase ?? supabase;

  const { data } = await withTiming("db.query", "organization_members.by_organization", async () =>
    membersClient
      .from("organization_members")
      .select("*")
      .eq("organization_id", memberRow.organization_id)
  );

  if (!data?.length) {
    return [];
  }

  const authUserLookup = await getOrganizationAuthUserLookup(
    data
      .map((member) => (typeof member.user_id === "string" ? member.user_id : ""))
      .filter(Boolean)
  );

  return mapTeamMembersWithFallbacks(data, authUserLookup);
});

export async function getAccountEngagementMetrics(): Promise<AccountEngagementMetrics> {
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();

  if (!supabase || !hasSupabaseEnv || !user || !memberRow?.organization_id) {
    return {
      teamMembersSignedIn: 0,
      teamMembersTotal: 0,
      totalDownloads: 0,
      downloadsThisMonth: 0,
      latestDownloadAt: null
    };
  }

  const adminSupabase = createSupabaseAdminClient();
  const metricsClient = adminSupabase ?? supabase;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: members },
    { count: totalDownloads },
    { count: downloadsThisMonth },
    { data: latestDownload }
  ] = await Promise.all([
    metricsClient
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", memberRow.organization_id),
    metricsClient
      .from("resource_downloads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", memberRow.organization_id),
    metricsClient
      .from("resource_downloads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", memberRow.organization_id)
      .gte("downloaded_at", monthStart.toISOString()),
    metricsClient
      .from("resource_downloads")
      .select("downloaded_at")
      .eq("organization_id", memberRow.organization_id)
      .order("downloaded_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const userIds = (members ?? [])
    .map((member) => (typeof member.user_id === "string" ? member.user_id : ""))
    .filter(Boolean);
  const authLookup = await getOrganizationAuthUserLookup(userIds);
  const teamMembersSignedIn = userIds.filter((userId) => Boolean(authLookup.get(userId)?.lastSignInAt)).length;

  return {
    teamMembersSignedIn,
    teamMembersTotal: members?.length ?? 0,
    totalDownloads: totalDownloads ?? 0,
    downloadsThisMonth: downloadsThisMonth ?? 0,
    latestDownloadAt: latestDownload?.downloaded_at ?? null
  };
}

export async function getAccountHolderEmail() {
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();

  if (!user) {
    return null;
  }

  if (!supabase || !hasSupabaseEnv) {
    return user.email ?? demoOwnerEmail;
  }

  if (!memberRow?.organization_id) {
    return null;
  }

  const { data: ownerRow } = await supabase
    .from("organization_members")
    .select("invitation_email")
    .eq("organization_id", memberRow.organization_id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  return ownerRow?.invitation_email ?? (isDemoOwnerEmail(user.email) ? user.email : null);
}

export async function getCheckoutProfile(): Promise<CheckoutProfile | null> {
  const adminSupabase = createSupabaseAdminClient();
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();

  if (!user?.email) {
    return null;
  }

  if (!supabase || !adminSupabase || !hasSupabaseEnv) {
    return isDemoOwnerEmail(user.email) ? demoCheckoutProfile : null;
  }

  if (!memberRow?.organization_id || memberRow.role !== "owner") {
    return null;
  }

  const [{ data: organization }, { data: latestOrder }] = await Promise.all([
    adminSupabase
      .from("organizations")
      .select("*")
      .eq("id", memberRow.organization_id)
      .limit(1)
      .maybeSingle(),
    adminSupabase
      .from("purchase_orders")
      .select(
        "account_holder_name, account_holder_email, church_name, billing_address_line1, billing_suburb, billing_state, billing_postcode, billing_country, billing_phone"
      )
      .eq("organization_id", memberRow.organization_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return {
    accountHolderName:
      memberRow.display_name ??
      organization?.account_holder_name ??
      latestOrder?.account_holder_name ??
      user.email.split("@")[0],
    churchName:
      normalizeOrganizationName(organization?.church_name ?? organization?.name) ??
      latestOrder?.church_name ??
      "New Creation Kids",
    email: memberRow.invitation_email ?? user.email,
    phone: organization?.billing_phone ?? latestOrder?.billing_phone ?? "",
    addressLine1:
      organization?.billing_address_line1 ?? latestOrder?.billing_address_line1 ?? "",
    suburb: organization?.billing_suburb ?? latestOrder?.billing_suburb ?? "",
    state: organization?.billing_state ?? latestOrder?.billing_state ?? "",
    postcode: organization?.billing_postcode ?? latestOrder?.billing_postcode ?? "",
    country: organization?.billing_country ?? latestOrder?.billing_country ?? "Australia"
  };
}

export async function getAccountPurchaseOrders(): Promise<PurchaseOrderSummary[]> {
  const adminSupabase = createSupabaseAdminClient();
  const { supabase, user, membership: memberRow } = await getOrganizationMembershipRow();

  if (!user) {
    return [];
  }

  if (!supabase || !adminSupabase || !hasSupabaseEnv) {
    return [];
  }

  if (!memberRow?.organization_id || memberRow.role !== "owner") {
    return [];
  }

  const { data, error } = await adminSupabase
    .from("purchase_orders")
    .select(
      "id, order_number, organization_id, account_holder_name, account_holder_email, church_name, plan_tier, amount, currency, payment_status, payment_provider, card_brand, card_last4, billing_address_line1, billing_suburb, billing_state, billing_postcode, billing_country, billing_phone, created_at"
    )
    .eq("organization_id", memberRow.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? [])
    .map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      organizationId: order.organization_id,
      accountHolderName: order.account_holder_name,
      accountHolderEmail: order.account_holder_email,
      churchName: order.church_name,
      planTier: order.plan_tier,
      amount: order.amount,
      currency: order.currency,
      paymentStatus: order.payment_status,
      paymentProvider: order.payment_provider,
      cardBrand: order.card_brand ?? "Card",
      cardLast4: order.card_last4 ?? "",
      billingAddressLine1: order.billing_address_line1,
      billingSuburb: order.billing_suburb,
      billingState: order.billing_state,
      billingPostcode: order.billing_postcode,
      billingCountry: order.billing_country,
      billingPhone: order.billing_phone ?? "",
      createdAt: order.created_at
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
