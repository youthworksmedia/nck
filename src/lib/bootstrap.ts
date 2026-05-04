import { demoOwnerEmails } from "@/lib/demo-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type BootstrapResult = {
  organizationId: string | null;
  error?: string;
};

type MinimalUser = {
  id: string;
  email?: string | null;
};

function fallbackDisplayName(email?: string | null) {
  return email?.split("@")[0] ?? "Account holder";
}

export async function ensureDemoOwnerBootstrap(user: MinimalUser | null) {
  if (!user?.email) {
    return { organizationId: null, error: "No signed-in user found." } satisfies BootstrapResult;
  }

  if (!demoOwnerEmails.some((entry) => entry.toLowerCase() === user.email?.toLowerCase())) {
    return { organizationId: null } satisfies BootstrapResult;
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      organizationId: null,
      error: "SUPABASE_SERVICE_ROLE_KEY is missing."
    } satisfies BootstrapResult;
  }

  const { data: existingMembership } = await adminSupabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership?.organization_id) {
    return { organizationId: existingMembership.organization_id } satisfies BootstrapResult;
  }

  const { data: existingOwnerMembership } = await adminSupabase
    .from("organization_members")
    .select("organization_id")
    .eq("invitation_email", user.email.toLowerCase())
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (existingOwnerMembership?.organization_id) {
    const { error: attachError } = await adminSupabase
      .from("organization_members")
      .update({ user_id: user.id })
      .eq("organization_id", existingOwnerMembership.organization_id)
      .eq("invitation_email", user.email.toLowerCase())
      .eq("role", "owner");

    if (!attachError) {
      return {
        organizationId: existingOwnerMembership.organization_id
      } satisfies BootstrapResult;
    }
  }

  const { data: existingOrganization } = await adminSupabase
    .from("organizations")
    .select("id")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle();

  let organizationId = existingOrganization?.id ?? null;

  if (!organizationId) {
    const { data: organization, error: orgError } = await adminSupabase
      .from("organizations")
      .insert({
        name: "New Creation Kids",
        owner_user_id: user.id
      })
      .select("id")
      .single();

    if (orgError || !organization) {
      return {
        organizationId: null,
        error: orgError?.message ?? "Could not create owner organization."
      } satisfies BootstrapResult;
    }

    organizationId = organization.id;
  }

  const { data: ownerMembershipRow } = await adminSupabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (ownerMembershipRow?.id) {
    const { error: updateMembershipError } = await adminSupabase
      .from("organization_members")
      .update({
        user_id: user.id,
        invitation_email: user.email.toLowerCase(),
        display_name: fallbackDisplayName(user.email)
      })
      .eq("id", ownerMembershipRow.id);

    if (updateMembershipError?.message?.includes("'display_name' column")) {
      const { error: retryError } = await adminSupabase
        .from("organization_members")
        .update({
          user_id: user.id,
          invitation_email: user.email.toLowerCase()
        })
        .eq("id", ownerMembershipRow.id);

      if (!retryError) {
        return { organizationId } satisfies BootstrapResult;
      }

      return {
        organizationId: null,
        error: retryError.message
      } satisfies BootstrapResult;
    }

    if (updateMembershipError) {
      return {
        organizationId: null,
        error: updateMembershipError.message
      } satisfies BootstrapResult;
    }
  } else {
    const { error: membershipInsertError } = await adminSupabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        invitation_email: user.email.toLowerCase(),
        display_name: fallbackDisplayName(user.email),
        role: "owner"
      });

    if (membershipInsertError?.message?.includes("'display_name' column")) {
      const { error: retryError } = await adminSupabase
        .from("organization_members")
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          invitation_email: user.email.toLowerCase(),
          role: "owner"
        });

      if (!retryError) {
        return { organizationId } satisfies BootstrapResult;
      }

      return {
        organizationId: null,
        error: retryError.message
      } satisfies BootstrapResult;
    }

    if (membershipInsertError) {
      return {
        organizationId: null,
        error: membershipInsertError.message
      } satisfies BootstrapResult;
    }
  }

  const { data: existingSubscription } = await adminSupabase
    .from("subscriptions")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  if (!existingSubscription) {
    const { error: subscriptionError } = await adminSupabase.from("subscriptions").insert({
      organization_id: organizationId,
      tier: "scale",
      status: "active"
    });

    if (subscriptionError) {
      return {
        organizationId: null,
        error: subscriptionError.message
      } satisfies BootstrapResult;
    }
  }

  return { organizationId } satisfies BootstrapResult;
}
