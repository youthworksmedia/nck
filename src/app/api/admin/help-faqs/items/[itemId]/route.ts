import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

const schema = z.object({
  question: z.string().trim().min(1),
  answerHtml: z.string().trim().min(1),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateFaqPages() {
  revalidatePath("/admin");
  revalidatePath("/help");
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    question: formData.get("question"),
    answerHtml: formData.get("answerHtml"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter a question and answer." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { itemId } = await context.params;
  const { error } = await adminSupabase
    .from("help_faq_items")
    .update({
      question: payload.data.question,
      answer_html: payload.data.answerHtml,
      display_order: payload.data.displayOrder,
      published: payload.data.status === "open",
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFaqPages();

  return NextResponse.json({ message: "FAQ saved." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const { itemId } = await context.params;
  const { error } = await adminSupabase.from("help_faq_items").delete().eq("id", itemId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateFaqPages();

  return NextResponse.json({ message: "FAQ deleted." });
}
