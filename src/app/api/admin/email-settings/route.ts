import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { normalizeEmailTemplateKey } from "@/lib/email-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  key: z.string().refine((value) => Boolean(normalizeEmailTemplateKey(value))),
  subject: z.string().trim().min(2),
  body: z.string().trim().min(10)
});

export async function PATCH(request: Request) {
  const isSuperAdmin = await isCurrentUserSuperAdmin();

  if (!isSuperAdmin) {
    return NextResponse.json({ message: "Admin login required." }, { status: 401 });
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { message: "Choose an email template and enter a subject and email body." },
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
