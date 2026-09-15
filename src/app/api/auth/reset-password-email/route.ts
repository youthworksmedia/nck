import { NextResponse } from "next/server";
import { z } from "zod";

import { sendResetEmail } from "@/lib/email-delivery";
import { formatEmailSender, getGeneralEmailSettings } from "@/lib/email-settings";
import { serverEnv } from "@/lib/env";
import { hasSupabaseEnv } from "@/lib/public-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().trim().email()
});

const successMessage = "If this email is registered, a password reset link has been sent.";

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { message: "Add Supabase environment variables to enable password reset emails." },
      { status: 400 }
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "Supabase admin access is required to send reset emails." },
      { status: 400 }
    );
  }

  const email = payload.data.email.toLowerCase();
  const generalSettings = await getGeneralEmailSettings();
  const redirectTo = `${generalSettings.siteUrl}/reset-password`;

  if (!serverEnv.resendApiKey || !formatEmailSender(generalSettings)) {
    return NextResponse.json(
      {
        message:
          "Password reset email could not be sent because custom email delivery is not configured. Add RESEND_API_KEY and sender settings in Admin."
      },
      { status: 400 }
    );
  }

  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo
    }
  });

  if (error) {
    return NextResponse.json({ message: successMessage });
  }

  const actionUrl = data.properties?.action_link;
  const hashedToken = data.properties?.hashed_token;

  if (!actionUrl || !hashedToken) {
    return NextResponse.json({ message: "Could not create a secure reset link." }, { status: 400 });
  }

  const emailUrl = `${generalSettings.siteUrl}/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;

  const resetEmail = await sendResetEmail({
    to: email,
    actionUrl,
    emailUrl
  });

  if (!resetEmail.ok) {
    return NextResponse.json(
      {
        message: resetEmail.skipped
          ? "Password reset email could not be sent because custom email delivery is not configured. Add RESEND_API_KEY and sender settings in Admin."
          : resetEmail.message
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: successMessage });
}
