import { serverEnv } from "@/lib/env";
import {
  type EmailTemplateKey,
  formatEmailSender,
  getEmailTemplates,
  getGeneralEmailSettings
} from "@/lib/email-settings";

type WelcomeEmailInput = {
  to: string;
  accountHolderName: string;
  churchName: string;
  planName: string;
};

type ActionEmailInput = {
  to: string;
  actionUrl: string;
  emailUrl?: string;
};

export type LifecycleEmailInput = {
  to: string;
  accountHolderName: string;
  churchName: string;
  planName: string;
  amount?: string;
  renewalDate?: string;
  accessEndsDate?: string;
  daysUntilRenewal?: number;
};

type SendEmailResult =
  | { ok: true; skipped?: false; message?: string }
  | { ok: false; skipped: true; message: string }
  | { ok: false; skipped?: false; message: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (body, [key, value]) => body.replaceAll(`{{${key}}}`, value),
    template
  );
}

function textToHtml(text: string) {
  return `<p>${escapeHtml(text).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<SendEmailResult> {
  if (!serverEnv.resendApiKey) {
    return {
      ok: false,
      skipped: true,
      message: "Welcome email skipped because RESEND_API_KEY is not configured."
    };
  }

  const [templates, generalSettings] = await Promise.all([
    getEmailTemplates(),
    getGeneralEmailSettings()
  ]);
  const template = templates.find((item) => item.key === "welcome");

  if (!template) {
    return { ok: false, message: "Welcome email template could not be loaded." };
  }

  const values = {
    accountHolderName: input.accountHolderName,
    churchName: input.churchName,
    loginUrl: `${generalSettings.siteUrl}/login`,
    planName: input.planName,
    siteUrl: generalSettings.siteUrl
  };
  const subject = renderEmailTemplate(template.subject, values);
  const text = renderEmailTemplate(template.body, values);

  return sendEmail({
    to: input.to,
    subject,
    text,
    from: formatEmailSender(generalSettings)
  });
}

export async function sendInviteEmail(input: ActionEmailInput): Promise<SendEmailResult> {
  const generalSettings = await getGeneralEmailSettings();
  const emailUrl = input.emailUrl ?? input.actionUrl;

  return sendActionEmail({
    templateKey: "invite",
    to: input.to,
    from: formatEmailSender(generalSettings),
    values: {
      actionUrl: emailUrl,
      inviteUrl: emailUrl,
      loginUrl: `${generalSettings.siteUrl}/login`,
      resetUrl: emailUrl,
      siteUrl: generalSettings.siteUrl
    }
  });
}

export async function sendResetEmail(input: ActionEmailInput): Promise<SendEmailResult> {
  const generalSettings = await getGeneralEmailSettings();
  const emailUrl = input.emailUrl ?? input.actionUrl;

  return sendActionEmail({
    templateKey: "reset",
    to: input.to,
    from: formatEmailSender(generalSettings),
    values: {
      actionUrl: emailUrl,
      inviteUrl: emailUrl,
      loginUrl: `${generalSettings.siteUrl}/login`,
      resetUrl: emailUrl,
      siteUrl: generalSettings.siteUrl
    }
  });
}

export async function sendRenewalReminderEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("renewal_reminder", input);
}

export async function sendRenewalConfirmationEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("renewal_confirmation", input);
}

export async function sendPaymentSuccessEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("payment_success", input);
}

export async function sendPaymentFailedEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("payment_failed", input);
}

export async function sendRefundRequestedEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("refund_requested", input);
}

export async function sendRefundConfirmationEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("refund_confirmation", input);
}

export async function sendCancellationConfirmationEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("cancellation_confirmation", input);
}

export async function sendAccessExpiryEmail(input: LifecycleEmailInput) {
  return sendLifecycleEmail("access_expiry", input);
}

async function sendLifecycleEmail(templateKey: EmailTemplateKey, input: LifecycleEmailInput) {
  const generalSettings = await getGeneralEmailSettings();

  return sendActionEmail({
    templateKey,
    to: input.to,
    from: formatEmailSender(generalSettings),
    values: {
      accountHolderName: input.accountHolderName,
      accountUrl: `${generalSettings.siteUrl}/account`,
      accessEndsDate: input.accessEndsDate ?? input.renewalDate ?? "",
      amount: input.amount ?? "",
      churchName: input.churchName,
      daysUntilRenewal: String(input.daysUntilRenewal ?? ""),
      loginUrl: `${generalSettings.siteUrl}/login`,
      planName: input.planName,
      renewalDate: input.renewalDate ?? "",
      siteUrl: generalSettings.siteUrl,
      supportEmail: generalSettings.supportEmail,
      surveyUrl: generalSettings.cancellationSurveyUrl || `${generalSettings.siteUrl}/account`
    }
  });
}

async function sendActionEmail(input: {
  templateKey: EmailTemplateKey;
  to: string;
  from: string;
  values: Record<string, string>;
}): Promise<SendEmailResult> {
  const templates = await getEmailTemplates();
  const template = templates.find((item) => item.key === input.templateKey);

  if (!template) {
    return { ok: false, message: "Email template could not be loaded." };
  }

  const subject = renderEmailTemplate(template.subject, input.values);
  const text = renderEmailTemplate(template.body, input.values);

  return sendEmail({
    to: input.to,
    subject,
    text,
    from: input.from
  });
}

async function sendEmail(input: { to: string; subject: string; text: string; from: string }): Promise<SendEmailResult> {
  if (!serverEnv.resendApiKey || !input.from) {
    return {
      ok: false,
      skipped: true,
      message: "Email skipped because RESEND_API_KEY and a sender email are not configured."
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: textToHtml(input.text),
      text: input.text
    })
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `Email could not be sent (${response.status}).`
    };
  }

  return { ok: true };
}
