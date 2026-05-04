import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentOrganizationMembership,
  getCurrentUser,
  getMembershipSnapshot,
  isCurrentUserOwner,
  isCurrentUserTeamMember
} from "@/lib/portal";
import { mapSavedLesson, savedLessonRowSchema } from "@/lib/lesson-builder";
import { planAllowsLessonBuilder } from "@/lib/plans";
import type { SavedLesson } from "@/types";

type LessonCreatorLookup = {
  email?: string;
  displayName?: string;
};

async function getLessonCreatorLookup(
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string
) {
  const lookup = new Map<string, LessonCreatorLookup>();

  if (!adminSupabase) {
    return lookup;
  }

  const { data: members } = await adminSupabase
    .from("organization_members")
    .select("user_id, invitation_email, display_name")
    .eq("organization_id", organizationId);

  const userIds = new Set<string>();

  for (const member of members ?? []) {
    const userId = typeof member.user_id === "string" ? member.user_id : "";
    const email = typeof member.invitation_email === "string" ? member.invitation_email : "";
    const displayName =
      typeof member.display_name === "string" && member.display_name.trim()
        ? member.display_name.trim()
        : undefined;

    if (userId) {
      userIds.add(userId);
      lookup.set(userId, { email: email || undefined, displayName });
    }

    if (email) {
      lookup.set(email.toLowerCase(), { email, displayName });
    }
  }

  await Promise.all(
    [...userIds].map(async (userId) => {
      const existing = lookup.get(userId);

      if (existing?.displayName) {
        return;
      }

      const { data, error } = await adminSupabase.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return;
      }

      const authEmail = data.user.email;
      const authDisplayName =
        typeof data.user.user_metadata?.full_name === "string" && data.user.user_metadata.full_name.trim()
          ? data.user.user_metadata.full_name.trim()
          : undefined;

      lookup.set(userId, {
        email: existing?.email ?? authEmail,
        displayName: existing?.displayName ?? authDisplayName
      });

      if (authEmail) {
        lookup.set(authEmail.toLowerCase(), {
          email: authEmail,
          displayName: existing?.displayName ?? authDisplayName
        });
      }
    })
  );

  return lookup;
}

export async function getLessonBuilderRouteAccess() {
  const [supabase, adminSupabase] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient())
  ]);

  if (!supabase) {
    return {
      allowed: false,
      user: null,
      organizationId: null,
      role: null as "owner" | "member" | null
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      allowed: false,
      user: null,
      organizationId: null,
      role: null as "owner" | "member" | null
    };
  }

  const normalizedEmail = user.email.toLowerCase();
  const membershipClient = adminSupabase ?? supabase;
  const { data: memberships } = await membershipClient
    .from("organization_members")
    .select("organization_id, role, user_id, invitation_email")
    .or(`user_id.eq.${user.id},invitation_email.eq.${normalizedEmail}`)
    .limit(10);

  const bestMatch =
    memberships?.find((membership) => membership.user_id === user.id) ??
    memberships?.find((membership) => membership.invitation_email?.toLowerCase() === normalizedEmail) ??
    null;

  if (!bestMatch?.organization_id) {
    return {
      allowed: false,
      user,
      organizationId: null,
      role: null as "owner" | "member" | null
    };
  }

  const { data: subscription } = await membershipClient
    .from("subscriptions")
    .select("status, tier")
    .eq("organization_id", bestMatch.organization_id)
    .limit(1)
    .maybeSingle();

  const isActive = Boolean(subscription && ["active", "trialing"].includes(subscription.status));
  const hasLessonBuilderPlan = Boolean(subscription && planAllowsLessonBuilder(subscription.tier));

  return {
    allowed: Boolean(bestMatch.role && isActive && hasLessonBuilderPlan),
    user,
    organizationId: bestMatch.organization_id,
    role: bestMatch.role === "owner" ? "owner" : "member"
  };
}

export async function canUseLessonBuilder() {
  const [user, membership, isOwner, isTeamMember] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserOwner(),
    isCurrentUserTeamMember()
  ]);

  const isActive = ["active", "trialing"].includes(membership.subscriptionStatus);
  const hasLessonBuilderPlan = planAllowsLessonBuilder(membership.planTier);

  return {
    user,
    isOwner,
    isTeamMember,
    isActive,
    hasLessonBuilderPlan,
    allowed: Boolean(user && (isOwner || isTeamMember) && isActive && hasLessonBuilderPlan)
  };
}

export async function getSavedLessons(): Promise<SavedLesson[]> {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const access = await getLessonBuilderRouteAccess();

  if (!supabase || !access.allowed || !access.user) {
    return [];
  }

  if (!access.organizationId) {
    return [];
  }

  const lessonsClient = adminSupabase ?? supabase;
  const creatorLookup = await getLessonCreatorLookup(adminSupabase, access.organizationId);

  const { data } = await lessonsClient
    .from("lesson_plans")
    .select("id, user_id, organization_id, title, passage, age_group, lesson_length, learning_goal, created_by_email, is_shared, lesson_data, updated_at")
    .eq("organization_id", access.organizationId)
    .or(`is_shared.eq.true,user_id.eq.${access.user.id}`)
    .order("updated_at", { ascending: false });

  if (!data?.length) {
    return [];
  }

  return data
    .map((row) => savedLessonRowSchema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => {
      const lesson = mapSavedLesson(result.data, access.user!.id);
      const creator =
        creatorLookup.get(result.data.user_id) ??
        creatorLookup.get(result.data.created_by_email.toLowerCase());

      return {
        ...lesson,
        createdByName: creator?.displayName?.trim() || undefined
      };
    });
}
