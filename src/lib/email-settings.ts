import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EmailTemplateKey = "invite" | "reset" | "welcome";

export type EmailTemplate = {
  key: EmailTemplateKey;
  label: string;
  description: string;
  subject: string;
  body: string;
};

export const defaultEmailTemplates: EmailTemplate[] = [
  {
    key: "invite",
    label: "Invite email",
    description: "Sent when an account holder invites a new sub account.",
    subject: "You have been invited to New Creation Kids",
    body:
      "Hi,\n\nYou have been invited to join your church's New Creation Kids account.\n\nOpen the invitation link in this email and create your password to access the curriculum resources.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "reset",
    label: "Reset email",
    description: "Sent when someone requests to create a new password.",
    subject: "Create a new password for New Creation Kids",
    body:
      "Hi,\n\nWe received a request to reset your New Creation Kids password.\n\nOpen the secure link in this email and create a new password. If you did not request this, you can ignore this email.\n\nBlessings,\nNew Creation Kids"
  },
  {
    key: "welcome",
    label: "Welcome email",
    description: "Sent to the account holder after their account is created.",
    subject: "Welcome to New Creation Kids",
    body:
      "Hi,\n\nWelcome to New Creation Kids. Your account is ready, and your ministry team can now access the curriculum library.\n\nLog in to view lessons, invite team members, and manage invoices from your dashboard.\n\nBlessings,\nNew Creation Kids"
  }
];

export function normalizeEmailTemplateKey(value: string): EmailTemplateKey | null {
  return value === "invite" || value === "reset" || value === "welcome" ? value : null;
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
