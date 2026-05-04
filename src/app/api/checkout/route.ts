import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createOrderNumber,
  detectFakeCardBrand,
  getCardLast4,
  getFakeExpiryDate,
  isAcceptedFakeCard
} from "@/lib/checkout";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { getPlanByTier } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/public-env";
import { addYears, formatISO } from "@/lib/time";

const checkoutSchema = z.object({
  tier: z.enum(["essential", "growth", "scale"]),
  accountHolderName: z.string().trim().min(2, "Add the account holder name."),
  churchName: z.string().trim().min(2, "Add the church name."),
  email: z.string().trim().email("Add a valid email address."),
  password: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  addressLine1: z.string().trim().min(3, "Add the billing address."),
  suburb: z.string().trim().min(2, "Add the suburb or city."),
  state: z.string().trim().min(2, "Add the state."),
  postcode: z.string().trim().min(2, "Add the postcode."),
  country: z.string().trim().min(2, "Add the country."),
  cardNumber: z.string().trim().min(12, "Add a fake test card number."),
  nameOnCard: z.string().trim().min(2, "Add the name on the card."),
  expiryMonth: z.string().trim().min(1, "Add the expiry month."),
  expiryYear: z.string().trim().min(2, "Add the expiry year."),
  cvc: z.string().trim().min(3, "Add the security code.")
});

async function findOwnerMembership(userId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  return data;
}

function getRenewalDates(existingPeriodEnd?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingEnd = existingPeriodEnd ? new Date(existingPeriodEnd) : null;

  if (existingEnd && !Number.isNaN(existingEnd.getTime())) {
    existingEnd.setHours(0, 0, 0, 0);

    if (existingEnd >= today) {
      return {
        startedAt: formatISO(existingEnd),
        renewalDate: formatISO(addYears(existingEnd, 1))
      };
    }
  }

  return {
    startedAt: formatISO(today),
    renewalDate: formatISO(addYears(today, 1))
  };
}

async function updateOrganizationCheckoutFields(
  adminSupabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  organizationId: string,
  ownerUserId: string,
  input: z.infer<typeof checkoutSchema>
) {
  const organizationPayload: Record<string, string> = {
    name: input.churchName,
    owner_user_id: ownerUserId,
    account_holder_name: input.accountHolderName,
    church_name: input.churchName,
    billing_address_line1: input.addressLine1,
    billing_suburb: input.suburb,
    billing_state: input.state,
    billing_postcode: input.postcode,
    billing_country: input.country,
    billing_phone: input.phone
  };

  let fields = { ...organizationPayload };

  while (true) {
    const { error } = await adminSupabase
      .from("organizations")
      .update(fields)
      .eq("id", organizationId);

    if (!error) {
      return;
    }

    const missingColumn = error.message.match(/Could not find the '([^']+)' column/i)?.[1];

    if (missingColumn && missingColumn in fields) {
      delete fields[missingColumn];
      continue;
    }

    throw new Error(error.message);
  }
}

async function updateOwnerMembershipName(
  adminSupabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  organizationId: string,
  ownerUserId: string,
  displayName: string
) {
  const { error } = await adminSupabase
    .from("organization_members")
    .update({ display_name: displayName })
    .eq("organization_id", organizationId)
    .eq("user_id", ownerUserId)
    .eq("role", "owner");

  if (!error || error.message.includes("'display_name' column")) {
    return;
  }

  throw new Error(error.message);
}

export async function POST(request: Request) {
  const adminSupabase = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();

  if (!adminSupabase || !supabase) {
    return NextResponse.json(
      {
        message: "Supabase environment variables are required for checkout."
      },
      { status: 500 }
    );
  }

  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message ?? "Checkout details are incomplete."
      },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const plan = getPlanByTier(input.tier);

  if (!plan) {
    return NextResponse.json({ message: "Invalid plan selected." }, { status: 400 });
  }

  if (!isAcceptedFakeCard(input.cardNumber)) {
    return NextResponse.json(
      {
        message:
          "Use one of the fake test cards on the page. Live card charging is not enabled yet."
      },
      { status: 400 }
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isSignedInOwner = Boolean(user && (await findOwnerMembership(user.id))?.organization_id);
  const normalizedEmail = input.email.toLowerCase();
  const orderNumber = createOrderNumber(plan.id);
  const cardBrand = detectFakeCardBrand(input.cardNumber);
  const cardLast4 = getCardLast4(input.cardNumber);

  let createdUserId: string | null = null;
  let createdOrganizationId: string | null = null;
  let orderId: string | null = null;

  try {
    let ownerUserId = user?.id ?? null;
    let organizationId: string | null = null;
    let renewalDates = getFakeExpiryDate();

    if (isSignedInOwner && ownerUserId) {
      const ownerMembership = await findOwnerMembership(ownerUserId);
      organizationId = ownerMembership?.organization_id ?? null;

      if (!organizationId) {
        return NextResponse.json(
          { message: "Could not find the current owner account for renewal." },
          { status: 400 }
        );
      }

      const { data: existingSubscription } = await adminSupabase
        .from("subscriptions")
        .select("current_period_end")
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

      renewalDates = getRenewalDates(existingSubscription?.current_period_end);
    } else {
      if (!isStrongPassword(input.password)) {
        return NextResponse.json(
          { message: passwordRequirementText },
          { status: 400 }
        );
      }

      const { data: existingUsers, error: listUsersError } = await adminSupabase.auth.admin.listUsers();

      if (listUsersError) {
        throw new Error(listUsersError.message);
      }

      const emailAlreadyExists = (existingUsers.users ?? []).some(
        (entry) => entry.email?.toLowerCase() === normalizedEmail
      );

      if (emailAlreadyExists) {
        return NextResponse.json(
          {
            message:
              "That email address already has an account. Please sign in or use a different email."
          },
          { status: 400 }
        );
      }

      const { data: createdUser, error: createUserError } =
        await adminSupabase.auth.admin.createUser({
          email: normalizedEmail,
          password: input.password,
          email_confirm: true
        });

      if (createUserError || !createdUser.user) {
        return NextResponse.json(
          { message: createUserError?.message ?? "Could not create the account." },
          { status: 400 }
        );
      }

      ownerUserId = createdUser.user.id;
      createdUserId = ownerUserId;

      const { data: organization, error: organizationError } = await adminSupabase
        .from("organizations")
        .insert({
          name: input.churchName,
          owner_user_id: ownerUserId
        })
        .select("id")
        .single();

      if (organizationError || !organization) {
        throw new Error(organizationError?.message ?? "Could not create the church account.");
      }

      organizationId = organization.id;
      createdOrganizationId = organizationId;

      const { error: membershipError } = await adminSupabase.from("organization_members").insert({
        organization_id: organizationId,
        user_id: ownerUserId,
        invitation_email: normalizedEmail,
        display_name: input.accountHolderName,
        role: "owner"
      });

      if (membershipError?.message?.includes("'display_name' column")) {
        const { error: retryError } = await adminSupabase.from("organization_members").insert({
          organization_id: organizationId,
          user_id: ownerUserId,
          invitation_email: normalizedEmail,
          role: "owner"
        });

        if (retryError) {
          throw new Error(retryError.message);
        }
      } else if (membershipError) {
        throw new Error(membershipError.message);
      }
    }

    if (!ownerUserId || !organizationId) {
      return NextResponse.json(
        { message: "Checkout could not attach the subscription to an account." },
        { status: 400 }
      );
    }

    await updateOrganizationCheckoutFields(adminSupabase, organizationId, ownerUserId, input);
    await updateOwnerMembershipName(adminSupabase, organizationId, ownerUserId, input.accountHolderName);

    const { data: order, error: orderError } = await adminSupabase
      .from("purchase_orders")
      .insert({
        organization_id: organizationId,
        owner_user_id: ownerUserId,
        order_number: orderNumber,
        account_holder_name: input.accountHolderName,
        account_holder_email: normalizedEmail,
        church_name: input.churchName,
        plan_tier: plan.id,
        amount: plan.annualPrice,
        currency: "usd",
        payment_status: "paid",
        payment_provider: "fake",
        card_brand: cardBrand,
        card_last4: cardLast4,
        billing_address_line1: input.addressLine1,
        billing_suburb: input.suburb,
        billing_state: input.state,
        billing_postcode: input.postcode,
        billing_country: input.country,
        billing_phone: input.phone
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(
        orderError?.message ??
          "The purchase record could not be created. Please update the database schema."
      );
    }

    orderId = order.id;

    const { error: subscriptionError } = await adminSupabase.from("subscriptions").upsert(
      {
        organization_id: organizationId,
        tier: plan.id,
        status: "active",
        started_at: renewalDates.startedAt,
        current_period_end: renewalDates.renewalDate,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "organization_id"
      }
    );

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    return NextResponse.json({
      message: `Purchase successful. Order ${orderNumber} is active.`,
      redirectTo: `${publicEnv.siteUrl}/account?checkout=success&order=${encodeURIComponent(orderNumber)}`,
      requiresSignIn: !isSignedInOwner
    });
  } catch (error) {
    if (orderId) {
      await adminSupabase.from("purchase_orders").delete().eq("id", orderId);
    }

    if (createdOrganizationId) {
      await adminSupabase.from("organizations").delete().eq("id", createdOrganizationId);
    }

    if (createdUserId) {
      await adminSupabase.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Checkout could not be completed. Please try again."
      },
      { status: 500 }
    );
  }
}
