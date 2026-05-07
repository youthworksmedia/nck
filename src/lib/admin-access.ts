import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseLessonResourceFiles } from "@/lib/lesson-resource-files";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/time";
import type {
  AccountHolderSummary,
  CurriculumTermNote,
  PurchaseOrderSummary,
  Resource,
  ResourceCategory,
  SuperAdminSummary
} from "@/types";

function normalizeOrganizationName(name?: string | null) {
  if (!name) {
    return "New Creation Kids";
  }

  return name;
}

export async function isCurrentUserSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  if (!supabase || !adminSupabase) {
    return false;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data } = await adminSupabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function getAdminCategories(): Promise<ResourceCategory[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data } = await adminSupabase
    .from("resource_categories")
    .select("id, name")
    .order("name", { ascending: true });

  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name
  }));
}

export async function getAdminResources(): Promise<Resource[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data } = await adminSupabase
    .from("resources")
    .select("*")
    .order("year_cycle", { ascending: true })
    .order("term", { ascending: true })
    .order("lesson_number", { ascending: true });

  return (data ?? []).map((resource) => ({
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

export async function getAdminTermNotes(): Promise<CurriculumTermNote[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data, error } = await adminSupabase
    .from("curriculum_term_notes")
    .select("year_cycle, term, content")
    .order("year_cycle", { ascending: true })
    .order("term", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((note) => ({
    yearCycle: note.year_cycle ?? "Year A",
    term: note.term ?? "Term 1",
    content: note.content ?? ""
  }));
}

export async function getSuperAdminEmails() {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data } = await adminSupabase
    .from("admin_roles")
    .select("*")
    .order("created_at", { ascending: false });

  return ((data ?? []) as Record<string, unknown>[]).map((entry) => ({
    userId: String(entry.user_id ?? ""),
    email: String(entry.email ?? ""),
    displayName:
      typeof entry.display_name === "string" && entry.display_name.trim()
        ? entry.display_name.trim()
        : String(entry.email ?? "").split("@")[0] || "Super admin",
    role: "super_admin",
    createdAt: String(entry.created_at ?? "")
  })) satisfies SuperAdminSummary[];
}

export async function getAccountHolderSummaries(): Promise<AccountHolderSummary[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const [{ data: owners }, { data: subscriptions }, { data: organizations }, { data: members }] =
    await Promise.all([
      adminSupabase
        .from("organization_members")
        .select("*")
        .eq("role", "owner"),
      adminSupabase
        .from("subscriptions")
        .select("organization_id, status, tier"),
      adminSupabase
        .from("organizations")
        .select("*"),
      adminSupabase
        .from("organization_members")
        .select("*")
        .order("joined_at", { ascending: true })
    ]);

  const subscriptionMap = new Map(
    (subscriptions ?? []).map((subscription) => [subscription.organization_id, subscription.status])
  );
  const subscriptionTierMap = new Map(
    (subscriptions ?? []).map((subscription) => [subscription.organization_id, subscription.tier])
  );
  const organizationMap = new Map(
    (organizations ?? []).map((organization) => [organization.id, normalizeOrganizationName(organization.name)])
  );
  const membersByOrganization = new Map<string, AccountHolderSummary["teamMembers"]>();

  for (const member of members ?? []) {
    const current = membersByOrganization.get(member.organization_id) ?? [];
    current.push({
      id: member.id,
      userId: member.user_id,
      name:
        (typeof member.display_name === "string" && member.display_name.trim()
          ? member.display_name.trim()
          : (member.invitation_email ?? "unknown@example.com").split("@")[0]),
      email: member.invitation_email ?? "unknown@example.com",
      role: member.role,
      status: member.user_id ? "active" : "invited",
      joinedAt: formatShortDate(member.joined_at)
    });
    membersByOrganization.set(member.organization_id, current);
  }

  return (owners ?? []).map((owner) => ({
    organizationId: owner.organization_id,
    organizationName: organizationMap.get(owner.organization_id) ?? "New Creation Kids",
    churchName:
      normalizeOrganizationName(
        organizations?.find((organization) => organization.id === owner.organization_id)?.church_name ??
          organizations?.find((organization) => organization.id === owner.organization_id)?.name
      ) ?? "New Creation Kids",
    planTier: subscriptionTierMap.get(owner.organization_id) ?? "essential",
    accountHolderName:
      (typeof owner.display_name === "string" && owner.display_name.trim()
        ? owner.display_name.trim()
        : organizations?.find((organization) => organization.id === owner.organization_id)?.account_holder_name?.trim?.()) ||
      (owner.invitation_email ?? "unknown@example.com").split("@")[0],
    accountHolderEmail: owner.invitation_email ?? "unknown@example.com",
    joinedAt: formatShortDate(owner.joined_at),
    subscriptionStatus: subscriptionMap.get(owner.organization_id) ?? "inactive",
    teamMembers: (membersByOrganization.get(owner.organization_id) ?? []).filter(
      (member) => member.role !== "owner"
    )
  }));
}

export async function getPurchaseOrders(): Promise<PurchaseOrderSummary[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data, error } = await adminSupabase
    .from("purchase_orders")
    .select(
      "id, order_number, organization_id, account_holder_name, account_holder_email, church_name, plan_tier, amount, currency, payment_status, payment_provider, card_brand, card_last4, billing_address_line1, billing_suburb, billing_state, billing_postcode, billing_country, billing_phone, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map((order) => ({
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
    billingAddressLine1: order.billing_address_line1 ?? "",
    billingSuburb: order.billing_suburb ?? "",
    billingState: order.billing_state ?? "",
    billingPostcode: order.billing_postcode ?? "",
    billingCountry: order.billing_country ?? "",
    billingPhone: order.billing_phone ?? "",
    createdAt: order.created_at
  }));
}
