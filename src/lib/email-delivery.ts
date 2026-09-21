import { serverEnv } from "@/lib/env";
import {
  type EmailTemplateKey,
  formatEmailSender,
  getEmailTemplates,
  getGeneralEmailSettings
} from "@/lib/email-settings";
import type { EmailAttachment } from "@/lib/invoice-email-attachment";

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
  invoiceAttachment?: EmailAttachment;
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

function normalizeSiteUrl(siteUrl?: string) {
  return (siteUrl || "https://new-creation-kids.vercel.app").replace(/\/+$/, "");
}

function linkifyText(value: string) {
  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const linkifyPlainUrls = (text: string) =>
    escapeHtml(text).replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" style="color:#2c89c1;text-decoration:underline;">$1</a>'
    );

  while ((match = markdownLinkPattern.exec(value)) !== null) {
    html += linkifyPlainUrls(value.slice(lastIndex, match.index));
    html += `<a href="${escapeHtml(match[2] ?? "")}" style="color:#2c89c1;text-decoration:underline;">${escapeHtml(match[1] ?? "")}</a>`;
    lastIndex = markdownLinkPattern.lastIndex;
  }

  html += linkifyPlainUrls(value.slice(lastIndex));

  return html;
}

function textToEmailContent(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = paragraph
        .split(/\n/)
        .map((line) => linkifyText(line))
        .join("<br />");

      return `<p style="margin:0 0 24px 0;color:#293344;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.58;">${html}</p>`;
    })
    .join("");
}

function textToEmailHtml(text: string, siteUrl?: string) {
  const baseUrl = normalizeSiteUrl(siteUrl);
  const logoUrl = `${baseUrl}/nck-logo-horiz.svg`;
  const contentHtml = textToEmailContent(text);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Creation Kids</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fa;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f6fa;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:30px 12px;">
          <table role="presentation" width="760" cellspacing="0" cellpadding="0" border="0" style="width:760px;max-width:100%;border-collapse:collapse;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
            <tr>
              <td style="background:#211d1b;padding:40px 44px;">
                <img src="${logoUrl}" width="226" height="61" alt="New Creation Kids" style="display:block;width:226px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:58px 46px 48px 46px;background:#ffffff;">
                ${contentHtml || textToHtml(text)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 46px 48px 46px;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;">
                  <tr>
                    <td style="border-top:1px solid #d9dee7;padding-top:24px;">
                      <p style="margin:0;color:#8a94a6;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">
                        <strong style="font-weight:700;">New Creation Kids</strong><br />
                        Helping kids know and follow Jesus.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function addPaymentInvoiceNote(body: string) {
  const invoiceLine =
    "Your tax invoice is attached to this email. You can also find it under {{accountSubscriptionUrl}}.";
  const signoffPattern = /\n\nBlessings,/i;
  const signoffMatch = body.match(signoffPattern);

  if (!signoffMatch || signoffMatch.index === undefined) {
    return `${body.trim()}\n\n${invoiceLine}`;
  }

  return `${body.slice(0, signoffMatch.index).trim()}\n\n${invoiceLine}${body.slice(signoffMatch.index)}`;
}

function normalizeRenewalConfirmationBody(body: string) {
  return body
    .replace(
      /Your team can continue using the curriculum library here:\s*\n\{\{accountUrl\}\}/i,
      "Your team can continue enjoying the subscription."
    )
    .replace(
      /Your team can continue using the curriculum library here:\s*\n\S+/i,
      "Your team can continue enjoying the subscription."
    );
}

function normalizePaymentSuccessBody(body: string) {
  return body
    .replace(
      /Your membership is active through \{\{renewalDate\}\}, and your invoice is available from your account:\s*\n\{\{accountUrl\}\}/i,
      "Your membership is active through {{renewalDate}}."
    )
    .replace(/\n\n\[Click here for downloading invoice \(PDF\)\]\(\{\{invoiceUrl\}\}\)/i, "")
    .replace(/\n\nYou can also review your account here:\s*\n\{\{accountUrl\}\}/i, "")
    .replace(/\n+\{\{invoiceUrl\}\}/g, "");
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
    from: formatEmailSender(generalSettings),
    siteUrl: generalSettings.siteUrl
  });
}

export async function sendInviteEmail(input: ActionEmailInput): Promise<SendEmailResult> {
  const generalSettings = await getGeneralEmailSettings();
  const emailUrl = input.emailUrl ?? input.actionUrl;

  return sendActionEmail({
    templateKey: "invite",
    to: input.to,
    from: formatEmailSender(generalSettings),
    siteUrl: generalSettings.siteUrl,
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
    siteUrl: generalSettings.siteUrl,
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
    siteUrl: generalSettings.siteUrl,
    values: {
      accountHolderName: input.accountHolderName,
      accountUrl: `${generalSettings.siteUrl}/account`,
      accountSubscriptionUrl: `${generalSettings.siteUrl.replace(/\/+$/, "")}/account/subscription`,
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
    },
    attachments: input.invoiceAttachment ? [input.invoiceAttachment] : undefined
  });
}

async function sendActionEmail(input: {
  templateKey: EmailTemplateKey;
  to: string;
  from: string;
  siteUrl: string;
  values: Record<string, string>;
  attachments?: EmailAttachment[];
}): Promise<SendEmailResult> {
  const templates = await getEmailTemplates();
  const template = templates.find((item) => item.key === input.templateKey);

  if (!template) {
    return { ok: false, message: "Email template could not be loaded." };
  }

  const subject = renderEmailTemplate(template.subject, input.values);
  const templateBody =
    input.templateKey === "renewal_confirmation"
      ? normalizeRenewalConfirmationBody(template.body)
      : input.templateKey === "payment_success"
        ? normalizePaymentSuccessBody(template.body)
      : template.body;
  const body =
    input.templateKey === "payment_success" &&
    Boolean(input.attachments?.length) &&
    !/attached/i.test(templateBody)
      ? addPaymentInvoiceNote(templateBody)
      : templateBody;
  const text = renderEmailTemplate(body, input.values);

  return sendEmail({
    to: input.to,
    subject,
    text,
    from: input.from,
    siteUrl: input.siteUrl,
    attachments: input.attachments
  });
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  from: string;
  siteUrl?: string;
  attachments?: EmailAttachment[];
}): Promise<SendEmailResult> {
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
      html: textToEmailHtml(input.text, input.siteUrl),
      text: input.text,
      ...(input.attachments?.length ? { attachments: input.attachments } : {})
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
