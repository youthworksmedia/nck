import { cache } from "react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeDiscountRow } from "@/lib/discounts";
import { parseLessonResourcePayload } from "@/lib/lesson-resource-files";
import { getStoredResourceFileSizes } from "@/lib/resource-assets";
import {
  curriculumSectionStorageValues,
  curriculumYearStorageValues,
  isCurrentCurriculumSection,
  isCurrentCurriculumYear,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import { getCurrentUser } from "@/lib/portal";
import { defaultPlans, normalizeProductRow, type Plan } from "@/lib/plans";
import { withTiming } from "@/lib/timing";
import { formatShortDate } from "@/lib/time";
import type {
  AccountHolderSummary,
  AdminDiscountCode,
  CurriculumTermNote,
  PurchaseOrderSummary,
  Resource,
  ResourceCategory,
  SuperAdminSummary
} from "@/types";

export type AdminOverviewMetrics = {
  resources: number;
  selectedLessons: number;
  products: number;
  accountHolders: number;
  subAccounts: number;
  orders: number;
  paidOrders: number;
};

function normalizeOrganizationName(name?: string | null) {
  if (!name) {
    return "New Creation Kids";
  }

  return name;
}

export const isCurrentUserSuperAdmin = cache(async function isCurrentUserSuperAdmin() {
  const adminSupabase = createSupabaseAdminClient();
  const user = await getCurrentUser();

  if (!user || !adminSupabase) {
    return false;
  }

  const { data } = await withTiming("db.query", "admin_roles.super_admin_lookup", async () =>
    adminSupabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle()
  );

  return Boolean(data);
});

export const getAdminCategories = cache(async function getAdminCategories(): Promise<ResourceCategory[]> {
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
});

export const getAdminResources = cache(async function getAdminResources(): Promise<Resource[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data } = await adminSupabase
    .from("resources")
    .select("*")
    .in("year_cycle", curriculumYearStorageValues("Volume 1"))
    .order("year_cycle", { ascending: true })
    .order("term", { ascending: true })
    .order("lesson_number", { ascending: true });

  const resources: Resource[] = (data ?? []).map((resource) => {
    const resourcePayload = parseLessonResourcePayload(resource.file_url, resource);

    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      lessonNumber: resource.lesson_number ?? 1,
      scripture: resource.scripture ?? "",
      bigIdea: resourcePayload.bigIdea,
      podcastTitle: resourcePayload.podcastTitle,
      podcastLinks: resourcePayload.podcastLinks,
      yearCycle: normalizeCurriculumYear(resource.year_cycle),
      term: normalizeCurriculumSection(resource.term),
      musicAvailable: Boolean(resource.music_file_path || resource.music_file_name),
      worksheetAvailable: Boolean(resource.worksheet_file_path || resource.worksheet_file_name),
      manualAvailable: Boolean(resource.manual_file_path || resource.manual_file_name),
      musicFilePath: resource.music_file_path ?? "",
      worksheetFilePath: resource.worksheet_file_path ?? "",
      manualFilePath: resource.manual_file_path ?? "",
      musicFileName: resource.music_file_name ?? "",
      worksheetFileName: resource.worksheet_file_name ?? "",
      manualFileName: resource.manual_file_name ?? "",
      attachments: resourcePayload.files,
      preschoolAttachments: resourcePayload.preschoolFiles,
      publishDate: resource.publish_date,
      expiryDate: resource.expiry_date,
      status: resource.published ? "open" : "closed"
    };
  });

  const sizeLookup = await getStoredResourceFileSizes(
    resources.flatMap((resource) => [
      ...(resource.attachments?.map((attachment) => attachment.filePath) ?? []),
      ...(resource.preschoolAttachments?.map((attachment) => attachment.filePath) ?? [])
    ])
  );

  return resources.map((resource) => ({
    ...resource,
    attachments: resource.attachments?.map((attachment) => ({
      ...attachment,
      sizeBytes: attachment.sizeBytes ?? sizeLookup.get(attachment.filePath)
    })),
    preschoolAttachments: resource.preschoolAttachments?.map((attachment) => ({
      ...attachment,
      sizeBytes: attachment.sizeBytes ?? sizeLookup.get(attachment.filePath)
    }))
  }));
});

export const getAdminTermNotes = cache(async function getAdminTermNotes(): Promise<CurriculumTermNote[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data, error } = await adminSupabase
    .from("curriculum_term_notes")
    .select("year_cycle, term, content")
    .in("year_cycle", curriculumYearStorageValues("Volume 1"))
    .order("year_cycle", { ascending: true })
    .order("term", { ascending: true });

  if (error) {
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
});

export const getAdminProducts = cache(async function getAdminProducts(): Promise<Plan[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return defaultPlans;
  }

  const { data, error } = await adminSupabase
    .from("products")
    .select("plan_tier, title, product_type, summary_html, prices, default_currency, stripe_price_ids, active")
    .order("display_order", { ascending: true });

  if (error || !data?.length) {
    return defaultPlans;
  }

  const productMap = new Map(
    data
      .map((row) => normalizeProductRow(row as Record<string, unknown>))
      .filter((plan): plan is Plan => Boolean(plan))
      .map((plan) => [plan.id, plan])
  );

  return defaultPlans.map((plan) => productMap.get(plan.id) ?? plan);
});

export const getAdminDiscountCodes = cache(async function getAdminDiscountCodes(): Promise<AdminDiscountCode[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const [{ data, error }, { data: redemptions }] = await Promise.all([
    adminSupabase
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("discount_redemptions")
      .select("discount_code_id")
  ]);

  if (error) {
    return [];
  }

  const redemptionCounts = new Map<string, number>();

  for (const redemption of redemptions ?? []) {
    redemptionCounts.set(
      redemption.discount_code_id,
      (redemptionCounts.get(redemption.discount_code_id) ?? 0) + 1
    );
  }

  return (data ?? []).map((row) => {
    const discount = normalizeDiscountRow(row as Record<string, unknown>);

    return {
      ...discount,
      redemptionCount: redemptionCounts.get(discount.id) ?? 0
    };
  });
});

export const getAdminOverviewMetrics = cache(async function getAdminOverviewMetrics(
  yearCycle: string,
  term: string
): Promise<AdminOverviewMetrics> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      resources: 0,
      selectedLessons: 0,
      products: defaultPlans.length,
      accountHolders: 0,
      subAccounts: 0,
      orders: 0,
      paidOrders: 0
    };
  }

  const [
    { count: resources },
    { count: selectedLessons },
    { count: products },
    { count: accountHolders },
    { count: subAccounts },
    { count: orders },
    { count: paidOrders }
  ] = await Promise.all([
    adminSupabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .in("year_cycle", curriculumYearStorageValues("Volume 1")),
    adminSupabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .in("year_cycle", curriculumYearStorageValues(yearCycle))
      .in("term", curriculumSectionStorageValues(term)),
    adminSupabase.from("products").select("id", { count: "exact", head: true }),
    adminSupabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner"),
    adminSupabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .neq("role", "owner"),
    adminSupabase.from("purchase_orders").select("id", { count: "exact", head: true }),
    adminSupabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
  ]);

  return {
    resources: resources ?? 0,
    selectedLessons: selectedLessons ?? 0,
    products: products ?? defaultPlans.length,
    accountHolders: accountHolders ?? 0,
    subAccounts: subAccounts ?? 0,
    orders: orders ?? 0,
    paidOrders: paidOrders ?? 0
  };
});

export const getSuperAdminEmails = cache(async function getSuperAdminEmails() {
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
        : String(entry.email ?? "").split("@")[0] || "Admin",
    role: "super_admin",
    createdAt: String(entry.created_at ?? "")
  })) satisfies SuperAdminSummary[];
});

export const getAccountHolderSummaries = cache(async function getAccountHolderSummaries(): Promise<AccountHolderSummary[]> {
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
});

export const getPurchaseOrders = cache(async function getPurchaseOrders(): Promise<PurchaseOrderSummary[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [];
  }

  const { data, error } = await adminSupabase
    .from("purchase_orders")
    .select(
      "id, order_number, organization_id, account_holder_name, account_holder_email, church_name, plan_tier, amount, original_amount, discount_code, discount_amount, currency, payment_status, payment_provider, card_brand, card_last4, billing_address_line1, billing_suburb, billing_state, billing_postcode, billing_country, billing_phone, created_at"
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
    amount: Number(order.amount ?? 0),
    originalAmount: order.original_amount === null || order.original_amount === undefined ? null : Number(order.original_amount),
    discountCode: order.discount_code ?? null,
    discountAmount: Number(order.discount_amount ?? 0),
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
});
