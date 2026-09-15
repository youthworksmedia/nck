import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  normalizeEmailTemplateKey,
  normalizeBooleanSetting,
  normalizeReminderDays,
  normalizeSiteUrl,
  normalizeTestimonials
} from "@/lib/email-settings";
import { normalizeDashboardSettings } from "@/lib/dashboard-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const templateSchema = z.object({
  type: z.literal("template").optional(),
  key: z.string().refine((value) => Boolean(normalizeEmailTemplateKey(value))),
  subject: z.string().trim().min(2),
  body: z.string().trim().min(10)
});

const generalSchema = z.object({
  type: z.literal("general"),
  isOffline: z.boolean().optional().default(false),
  siteUrl: z.string().trim().optional().default(""),
  senderName: z.string().trim().min(1),
  senderEmail: z.string().trim().email(),
  renewalReminderDays: z.coerce.number().int().min(1).max(180),
  cancellationSurveyUrl: z.string().trim().url().optional().or(z.literal("")).default(""),
  supportEmail: z.string().trim().email()
});

const homepageSchema = z.object({
  type: z.literal("homepage"),
  testimonials: z
    .array(
      z.object({
        quote: z.string().trim().min(10),
        name: z.string().trim().min(2),
        church: z.string().trim().optional().default("")
      })
    )
    .min(1)
    .max(3)
});

const dashboardSchema = z.object({
  type: z.literal("dashboard"),
  firstTimeHtml: z.string().trim().min(10),
  returningHtml: z.string().trim().min(10).optional(),
  returningHtmls: z.array(z.string().trim().min(10)).min(1).max(20).optional(),
  introVideoTitle: z.string().trim().optional().default(""),
  introVideoUrl: z.string().trim().url().optional().or(z.literal("")).default(""),
  bibleVerses: z
    .array(
      z.object({
        text: z.string().trim().min(3),
        reference: z.string().trim().min(2)
      })
    )
    .min(1)
    .max(30)
});

const schema = z.union([templateSchema, generalSchema, homepageSchema, dashboardSchema]);

export async function PATCH(request: Request) {
  const isSuperAdmin = await isCurrentUserSuperAdmin();

  if (!isSuperAdmin) {
    return NextResponse.json({ message: "Admin login required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { message: "Enter valid settings before saving." },
      { status: 400 }
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "Supabase admin access is required to save settings." },
      { status: 400 }
    );
  }

  if (payload.data.type === "general") {
    const rows = [
      {
        key: "site_offline",
        value: String(normalizeBooleanSetting(payload.data.isOffline)),
        updated_at: new Date().toISOString()
      },
      {
        key: "site_url",
        value: normalizeSiteUrl(payload.data.siteUrl),
        updated_at: new Date().toISOString()
      },
      {
        key: "email_sender_name",
        value: payload.data.senderName,
        updated_at: new Date().toISOString()
      },
      {
        key: "email_sender_email",
        value: payload.data.senderEmail,
        updated_at: new Date().toISOString()
      },
      {
        key: "renewal_reminder_days",
        value: String(normalizeReminderDays(payload.data.renewalReminderDays)),
        updated_at: new Date().toISOString()
      },
      {
        key: "cancellation_survey_url",
        value: payload.data.cancellationSurveyUrl,
        updated_at: new Date().toISOString()
      },
      {
        key: "support_email",
        value: payload.data.supportEmail,
        updated_at: new Date().toISOString()
      }
    ];

    const { error } = await adminSupabase.from("curriculum_settings").upsert(rows, {
      onConflict: "key"
    });

    if (error) {
      return NextResponse.json(
        {
          message:
            error.message.includes("curriculum_settings")
              ? "Settings table is missing. Run the latest Supabase schema, then save again."
              : error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "General settings saved." });
  }

  if (payload.data.type === "homepage") {
    const testimonials = normalizeTestimonials(payload.data.testimonials);

    if (!testimonials.length) {
      return NextResponse.json({ message: "Add at least one testimonial." }, { status: 400 });
    }

    const { error } = await adminSupabase.from("curriculum_settings").upsert(
      {
        key: "homepage_testimonials",
        value: JSON.stringify({ testimonials }),
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    );

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    revalidateTag("homepage-settings");
    revalidatePath("/");

    return NextResponse.json({ message: "Homepage settings saved." });
  }

  if (payload.data.type === "dashboard") {
    const dashboardSettings = normalizeDashboardSettings({
      ...payload.data,
      returningHtml:
        payload.data.returningHtml ??
        payload.data.returningHtmls?.[0] ??
        ""
    });

    const { error } = await adminSupabase.from("curriculum_settings").upsert(
      {
        key: "dashboard_welcome_settings",
        value: JSON.stringify(dashboardSettings),
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    );

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    revalidateTag("dashboard-welcome-settings");
    revalidatePath("/account");

    return NextResponse.json({ message: "Dashboard settings saved." });
  }

  const templateKey = normalizeEmailTemplateKey(payload.data.key);

  if (!templateKey) {
    return NextResponse.json({ message: "Unknown email template." }, { status: 400 });
  }

  const { error } = await adminSupabase.from("email_templates").upsert(
    {
      template_key: templateKey,
      subject: payload.data.subject,
      body: payload.data.body,
      updated_at: new Date().toISOString()
    },
    { onConflict: "template_key" }
  );

  if (error) {
    return NextResponse.json(
      {
        message:
          error.message.includes("email_templates")
            ? "Email settings table is missing. Run the latest Supabase schema, then save again."
            : error.message
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: "Email template saved." });
}
