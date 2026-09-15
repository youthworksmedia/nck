import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";

export type EmailTemplateKey =
  | "invite"
  | "reset"
  | "welcome"
  | "renewal_reminder"
  | "renewal_confirmation"
  | "payment_success"
  | "payment_failed"
  | "refund_requested"
  | "refund_confirmation"
  | "cancellation_confirmation"
  | "access_expiry";

export type EmailTemplate = {
  key: EmailTemplateKey;
  label: string;
  description: string;
  subject: string;
  body: string;
};

export type GeneralEmailSettings = {
  isOffline: boolean;
  siteUrl: string;
  senderName: string;
  senderEmail: string;
  renewalReminderDays: number;
  cancellationSurveyUrl: string;
  supportEmail: string;
};

export type HomepageTestimonial = {
  quote: string;
  name: string;
  church: string;
};

export type HomepageSettings = {
  testimonials: HomepageTestimonial[];
};

export const defaultGeneralEmailSettings: GeneralEmailSettings = {
  isOffline: false,
  siteUrl: publicEnv.siteUrl || "http://localhost:3001",
  senderName: "New Creation Kids",
  senderEmail: serverEnv.emailFrom.includes("<")
    ? serverEnv.emailFrom.match(/<([^>]+)>/)?.[1] ?? ""
    : serverEnv.emailFrom,
  renewalReminderDays: 30,
  cancellationSurveyUrl: "",
  supportEmail: serverEnv.emailFrom.includes("<")
    ? serverEnv.emailFrom.match(/<([^>]+)>/)?.[1] ?? ""
    : serverEnv.emailFrom
};

export const defaultHomepageSettings: HomepageSettings = {
  testimonials: [
    {
      quote:
        "New Creation Kids helped our leaders stop scrambling each week and gave us a clear Bible-shaped pathway for the year.",
      name: "Sarah M.",
      church: "Children's Ministry Coordinator"
    },
    {
      quote:
        "The lesson structure is easy for volunteers to follow, and the resource library makes Sunday preparation much quicker.",
      name: "Mark R.",
      church: "Senior Pastor"
    },
    {
      quote:
        "It feels warm, thoughtful, and practical. Our team can see the curriculum plan and get what they need without chasing files.",
      name: "Jess T.",
      church: "Kids Church Team Leader"
    }
  ]
};

export const defaultEmailTemplates: EmailTemplate[] = [
  {
    key: "invite",
    label: "Invite email",
    description: "Sent when an account holder invites a new sub account. Use {{inviteUrl}} where the secure invite link should appear.",
    subject: "You have been invited to New Creation Kids",
    body:
      "Hi,\n\nYou have been invited to join your church's New Creation Kids account.\n\nOpen this secure invitation link and create your password to access the curriculum resources:\n{{inviteUrl}}\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "reset",
    label: "Reset email",
    description: "Sent when someone requests to create a new password. Use {{resetUrl}} where the secure reset link should appear.",
    subject: "Create a new password for New Creation Kids",
    body:
      "Hi,\n\nWe received a request to reset your New Creation Kids password.\n\nOpen this secure link and create a new password:\n{{resetUrl}}\n\nIf you did not request this, you can ignore this email.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "welcome",
    label: "Welcome email",
    description: "Sent to the account holder after their account is created. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{loginUrl}}, {{siteUrl}}.",
    subject: "Welcome to New Creation Kids",
    body:
      "Hi {{accountHolderName}},\n\nWelcome to New Creation Kids. Your {{churchName}} account is ready on the {{planName}} plan, and your ministry team can now access the curriculum library.\n\nLog in here to view lessons, invite team members, and manage your account from your dashboard:\n{{loginUrl}}\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "renewal_reminder",
    label: "Renewal reminder",
    description:
      "Sent before a membership renews. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{renewalDate}}, {{daysUntilRenewal}}, {{accountUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "Your New Creation Kids membership renews in {{daysUntilRenewal}} days",
    body:
      "Hi {{accountHolderName}},\n\nYour {{churchName}} New Creation Kids membership is due to renew on {{renewalDate}}.\n\nYou are currently on the {{planName}} plan. You can review your account, team access, and purchase history here:\n{{accountUrl}}\n\nIf your church needs to change plan or discuss renewal, contact us at {{supportEmail}}.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "renewal_confirmation",
    label: "Renewal confirmation",
    description:
      "Sent after a membership renewal is recorded. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{renewalDate}}, {{accountUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "Your New Creation Kids membership has renewed",
    body:
      "Hi {{accountHolderName}},\n\nThanks for renewing New Creation Kids for {{churchName}}. Your {{planName}} membership is active through {{renewalDate}}.\n\nYour team can continue using the curriculum library here:\n{{accountUrl}}\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "payment_success",
    label: "Payment success",
    description:
      "Sent after a subscription payment succeeds. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{amount}}, {{renewalDate}}, {{accountUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "Your New Creation Kids payment was successful",
    body:
      "Hi {{accountHolderName}},\n\nYour {{amount}} payment for the {{churchName}} New Creation Kids {{planName}} membership was successful.\n\nYour membership is active through {{renewalDate}}, and your invoice is available from your account:\n{{accountUrl}}\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "payment_failed",
    label: "Payment failed",
    description:
      "Sent when a recurring subscription payment fails. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{amount}}, {{renewalDate}}, {{accountUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "Action needed: New Creation Kids payment failed",
    body:
      "Hi {{accountHolderName}},\n\nWe could not process the {{amount}} renewal payment for the {{churchName}} New Creation Kids {{planName}} membership.\n\nPlease review your subscription and payment details here:\n{{accountUrl}}\n\nIf you need help, contact {{supportEmail}}.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "refund_requested",
    label: "Refund requested",
    description:
      "Sent when an admin stops access and marks a payment for refund review. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{amount}}, {{accountUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "Your New Creation Kids refund is being reviewed",
    body:
      "Hi {{accountHolderName}},\n\nWe have stopped automatic access for the {{churchName}} New Creation Kids {{planName}} membership and marked the {{amount}} payment for refund review.\n\nOur team will process the refund through Stripe where eligible. If you have questions, contact {{supportEmail}}.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "refund_confirmation",
    label: "Refund confirmation",
    description:
      "Sent when an admin records a completed refund. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{amount}}, {{accountUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "Your New Creation Kids refund has been recorded",
    body:
      "Hi {{accountHolderName}},\n\nThis confirms that the {{amount}} payment for the {{churchName}} New Creation Kids {{planName}} membership has been marked as refunded.\n\nRefund timing depends on your bank or card provider. If you have questions, contact {{supportEmail}}.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "cancellation_confirmation",
    label: "Cancellation confirmation",
    description:
      "Sent when a membership is marked for cancellation. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{accessEndsDate}}, {{accountUrl}}, {{surveyUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "New Creation Kids cancellation confirmation",
    body:
      "Hi {{accountHolderName}},\n\nThis confirms that the New Creation Kids membership for {{churchName}} has been marked to cancel. Your team will keep access until {{accessEndsDate}}.\n\nIf you have a moment, we would value one sentence of feedback:\n{{surveyUrl}}\n\nIf this was a mistake, contact us at {{supportEmail}}.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "access_expiry",
    label: "Access expiry",
    description:
      "Sent when membership access has expired. Available codes: {{accountHolderName}}, {{churchName}}, {{planName}}, {{accountUrl}}, {{surveyUrl}}, {{siteUrl}}, {{supportEmail}}.",
    subject: "New Creation Kids access has ended",
    body:
      "Hi {{accountHolderName}},\n\nNew Creation Kids access for {{churchName}} has now ended. Your account can still preview lesson titles and descriptions, but downloads are locked until the membership is renewed.\n\nRenew or review your account here:\n{{accountUrl}}\n\nFeedback is welcome here:\n{{surveyUrl}}\n\nBlessings,\nNew Creation Kids"
  }
];

export function normalizeEmailTemplateKey(value: string): EmailTemplateKey | null {
  return defaultEmailTemplates.some((template) => template.key === value)
    ? (value as EmailTemplateKey)
    : null;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return defaultEmailTemplates;
  }

  const { data, error } = await adminSupabase
    .from("email_templates")
    .select("template_key, subject, body")
    .in("template_key", defaultEmailTemplates.map((template) => template.key));

  if (error) {
    return defaultEmailTemplates;
  }

  const savedTemplateMap = new Map(
    (data ?? []).map((template) => [
      template.template_key,
      {
        subject: template.subject ?? "",
        body: template.body ?? ""
      }
    ])
  );

  return defaultEmailTemplates.map((template) => {
    const savedTemplate = savedTemplateMap.get(template.key);

    return savedTemplate
      ? {
          ...template,
          subject: savedTemplate.subject || template.subject,
          body: savedTemplate.body || template.body
        }
      : template;
  });
}

export async function getGeneralEmailSettings(): Promise<GeneralEmailSettings> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return defaultGeneralEmailSettings;
  }

  const { data, error } = await adminSupabase
    .from("curriculum_settings")
    .select("key, value")
    .in("key", [
      "site_url",
      "email_sender_name",
      "email_sender_email",
      "site_offline",
      "renewal_reminder_days",
      "cancellation_survey_url",
      "support_email"
    ]);

  if (error) {
    return defaultGeneralEmailSettings;
  }

  const settingsMap = new Map((data ?? []).map((entry) => [entry.key, entry.value ?? ""]));

  return {
    isOffline: normalizeBooleanSetting(settingsMap.get("site_offline")),
    siteUrl: normalizeSiteUrl(settingsMap.get("site_url") || defaultGeneralEmailSettings.siteUrl),
    senderName: settingsMap.get("email_sender_name") || defaultGeneralEmailSettings.senderName,
    senderEmail: settingsMap.get("email_sender_email") || defaultGeneralEmailSettings.senderEmail,
    renewalReminderDays: normalizeReminderDays(settingsMap.get("renewal_reminder_days")),
    cancellationSurveyUrl: settingsMap.get("cancellation_survey_url") || "",
    supportEmail: settingsMap.get("support_email") || defaultGeneralEmailSettings.supportEmail
  };
}

export async function getSiteOfflineSetting(): Promise<boolean> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return defaultGeneralEmailSettings.isOffline;
  }

  const { data, error } = await adminSupabase
    .from("curriculum_settings")
    .select("value")
    .eq("key", "site_offline")
    .limit(1)
    .maybeSingle();

  if (error) {
    return defaultGeneralEmailSettings.isOffline;
  }

  return normalizeBooleanSetting(data?.value);
}

async function getHomepageSettingsFromDatabase(): Promise<HomepageSettings> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return defaultHomepageSettings;
  }

  const { data, error } = await adminSupabase
    .from("curriculum_settings")
    .select("value")
    .eq("key", "homepage_testimonials")
    .limit(1)
    .maybeSingle();

  if (error || !data?.value) {
    return defaultHomepageSettings;
  }

  try {
    const parsed = JSON.parse(data.value) as HomepageSettings;
    const testimonials = normalizeTestimonials(parsed.testimonials);

    return testimonials.length ? { testimonials } : defaultHomepageSettings;
  } catch {
    return defaultHomepageSettings;
  }
}

export const getHomepageSettings = unstable_cache(
  getHomepageSettingsFromDatabase,
  ["homepage-settings"],
  {
    revalidate: 300,
    tags: ["homepage-settings"]
  }
);

export function normalizeReminderDays(value?: string | number | null) {
  const numericValue = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(numericValue)) {
    return defaultGeneralEmailSettings.renewalReminderDays;
  }

  return Math.min(180, Math.max(1, numericValue));
}

export function normalizeTestimonials(value?: HomepageTestimonial[] | null) {
  return (value ?? [])
    .map((testimonial) => ({
      quote: String(testimonial.quote ?? "").trim(),
      name: String(testimonial.name ?? "").trim(),
      church: String(testimonial.church ?? "").trim()
    }))
    .filter((testimonial) => testimonial.quote && testimonial.name)
    .slice(0, 3);
}

export function normalizeSiteUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  return trimmed || "http://localhost:3001";
}

export function normalizeBooleanSetting(value?: string | boolean | null) {
  if (typeof value === "boolean") {
    return value;
  }

  return value === "true" || value === "1" || value === "yes";
}

export function formatEmailSender(settings: GeneralEmailSettings) {
  const email = settings.senderEmail.trim() || defaultGeneralEmailSettings.senderEmail;
  const name = settings.senderName.trim() || defaultGeneralEmailSettings.senderName;

  if (!email) {
    return "";
  }

  return name ? `${name} <${email}>` : email;
}
