import { cache } from "react";
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
import { parseLessonResourceFiles } from "@/lib/lesson-resource-files";
import { hasSupabaseEnv } from "@/lib/public-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
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
  email?: string;
  fullName?: string;
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
          email: data.user.email,
          fullName:
            typeof data.user.user_metadata?.full_name === "string"
              ? data.user.user_metadata.full_name
              : undefined
        }
      ] as const;
    })
  );

  const entries: Array<[string, AuthUserLookup]> = results
    .filter((entry): entry is NonNullable<(typeof results)[number]> => entry !== null)
    .map((entry) => [entry[0], entry[1]]);

  return new Map(entries);
}

const getOrganizationMembershipRow = cache(async function getOrganizationMembershipRow() {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const user = await getCurrentUser();

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

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("id, organization_id, role, user_id, invitation_email, display_name")
    .or(`user_id.eq.${user.id},invitation_email.eq.${normalizedEmail}`)
    .limit(10);

  const rows = memberships?.length
    ? memberships
    : (
        await membershipClient
          .from("organization_members")
          .select("id, organization_id, role, user_id, invitation_email, display_name")
          .or(`user_id.eq.${user.id},invitation_email.eq.${normalizedEmail}`)
          .limit(10)
      ).data;

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

    return {
      id: typeof member.id === "string" ? member.id : "",
      userId,
      name:
        (typeof member.display_name === "string" && member.display_name.trim()) ||
        authUser?.fullName ||
        fallbackPersonName(invitationEmail ?? authUser?.email, role),
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
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      id: "demo-user",
      email: demoOwnerEmail
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
});

export async function isCurrentUserOwner() {
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
}

export async function isCurrentUserTeamMember() {
  const { supabase, user, membership } = await getOrganizationMembershipRow();

  if (!user || !supabase || !hasSupabaseEnv) {
    return false;
  }

  return membership?.role === "member";
}

export async function getMembershipSnapshot(): Promise<MembershipSnapshot> {
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
  ] = await Promise.all([
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
  ]);

  if (!organization || !subscription) {
    return inactiveMembership;
  }

  return {
    organizationName: normalizeOrganizationName(organization.name),
    churchName: normalizeOrganizationName(
      organization.church_name ?? latestOrder?.church_name ?? organization.name
    ),
    accountHolderName:
      organization.account_holder_name ??
      latestOrder?.account_holder_name ??
      ownerRow?.display_name ??
      fallbackPersonName(ownerRow?.invitation_email, "owner"),
    planTier: subscription.tier ?? latestOrder?.plan_tier,
    subscriptionStatus: subscription.status,
    renewalDate: subscription.current_period_end,
    memberCount: memberCount ?? 0
  };
}

export async function getResources(): Promise<Resource[]> {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const { user } = await getCurrentOrganizationMembership();

  if (!supabase || !hasSupabaseEnv) {
    return user && isDemoOwnerEmail(user.email) ? demoResources : [];
  }

  const resourcesClient = adminSupabase ?? supabase;

  const { data } = await resourcesClient
    .from("resources")
    .select("*")
    .eq("published", true)
    .lte("publish_date", formatISO(new Date()))
    .or(`expiry_date.is.null,expiry_date.gte.${formatISO(new Date())}`)
    .order("year_cycle", { ascending: true })
    .order("term", { ascending: true })
    .order("lesson_number", { ascending: true });

  if (!data?.length) {
    return [];
  }

  return data.map((resource) => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      lessonNumber: resource.lesson_number ?? 1,
      scripture: resource.scripture ?? "",
      yearCycle: resource.year_cycle ?? "Year A",
      term: resource.term ?? "Term 1",
      musicAvailable: Boolean(resource.music_file_path || resource.music_file_name),
      worksheetAvailable: Boolean(resource.worksheet_file_path || resource.worksheet_file_name),
      manualAvailable: Boolean(resource.manual_file_path || resource.manual_file_name),
      musicFilePath: resource.music_file_path ?? "",
      worksheetFilePath: resource.worksheet_file_path ?? "",
      manualFilePath: resource.manual_file_path ?? "",
      musicFileName: resource.music_file_name ?? "",
      worksheetFileName: resource.worksheet_file_name ?? "",
      manualFileName: resource.manual_file_name ?? "",
      attachments: parseLessonResourceFiles(resource.file_url, resource),
      publishDate: resource.publish_date,
      expiryDate: resource.expiry_date,
      status: resource.published ? "open" : "closed"
  }));
}

export async function getCurriculumTermNotes(): Promise<CurriculumTermNote[]> {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const { user } = await getCurrentOrganizationMembership();

  if (!supabase || !hasSupabaseEnv) {
    return user && isDemoOwnerEmail(user.email) ? demoTermNotes : [];
  }

  const notesClient = adminSupabase ?? supabase;

  const { data, error } = await notesClient
    .from("curriculum_term_notes")
    .select("year_cycle, term, content")
    .order("year_cycle", { ascending: true })
    .order("term", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return data.map((note) => ({
    yearCycle: note.year_cycle ?? "Year A",
    term: note.term ?? "Term 1",
    content: note.content ?? ""
  }));
}

export async function getTeamMembers(): Promise<TeamMember[]> {
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

  const { data } = await membersClient
    .from("organization_members")
    .select("*")
    .eq("organization_id", memberRow.organization_id);

  if (!data?.length) {
    return [];
  }

  const authUserLookup = await getOrganizationAuthUserLookup(
    data
      .map((member) => (typeof member.user_id === "string" ? member.user_id : ""))
      .filter(Boolean)
  );

  return mapTeamMembersWithFallbacks(data, authUserLookup);
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
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const user = await getCurrentUser();

  if (!user?.email) {
    return null;
  }

  if (!supabase || !adminSupabase || !hasSupabaseEnv) {
    return isDemoOwnerEmail(user.email) ? demoCheckoutProfile : null;
  }

  const { data: memberRow } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!memberRow?.organization_id) {
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
      latestOrder?.account_holder_name ??
      organization?.account_holder_name ??
      user.email.split("@")[0],
    churchName:
      normalizeOrganizationName(organization?.church_name ?? organization?.name) ??
      latestOrder?.church_name ??
      "New Creation Kids",
    email: latestOrder?.account_holder_email ?? user.email,
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
