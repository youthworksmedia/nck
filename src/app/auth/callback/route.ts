import { NextResponse } from "next/server";

import { ensureDemoOwnerBootstrap } from "@/lib/bootstrap";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startTimer, withTiming } from "@/lib/timing";

export async function GET(request: Request) {
  const timer = startTimer("route.handler", "GET /auth/callback");

  try {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/account";

  const supabase = await createSupabaseServerClient();

  if (supabase && code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (supabase) {
    const {
      data: { user }
    } = await withTiming("supabase.auth", "auth_callback.getUser", async () => supabase.auth.getUser());

    if (user?.email) {
      await ensureDemoOwnerBootstrap(user);

      const adminSupabase = createSupabaseAdminClient();

      if (adminSupabase) {
        await adminSupabase
          .from("organization_members")
          .update({
            user_id: user.id
          })
          .eq("invitation_email", user.email.toLowerCase())
          .is("user_id", null);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
  } finally {
    console.timeEnd(timer);
  }
}
