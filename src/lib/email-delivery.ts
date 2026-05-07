import { serverEnv } from "@/lib/env";
import { getEmailTemplates } from "@/lib/email-settings";
import { publicEnv } from "@/lib/public-env";

type WelcomeEmailInput = {
  to: string;
  accountHolderName: string;
  churchName: string;
  planName: string;
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

function renderTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (body, [key, value]) => body.replaceAll(`{{${key}}}`, value),
    template
  );
}

function textToHtml(text: string) {
  return `<p>${escapeHtml(text).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<SendEmailResult> {
  if (!serverEnv.resendApiKey || !serverEnv.emailFrom) {
    return {
      ok: false,
      skipped: true,
      message: "Welcome email skipped because RESEND_API_KEY and EMAIL_FROM are not configured."
    };
  }

  const templates = await getEmailTemplates();
  const template = templates.find((item) => item.key === "welcome");

  if (!template) {
    return { ok: false, message: "Welcome email template could not be loaded." };
  }

  const values = {
    accountHolderName: input.accountHolderName,
    churchName: input.churchName,
    loginUrl: `${publicEnv.siteUrl}/login`,
    planName: input.planName,
    siteUrl: publicEnv.siteUrl
  };
  const subject = renderTemplate(template.subject, values);
  const text = renderTemplate(template.body, values);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: serverEnv.emailFrom,
      to: input.to,
      subject,
      html: textToHtml(text),
      text
    })
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `Welcome email could not be sent (${response.status}).`
    };
  }

  return { ok: true };
}
