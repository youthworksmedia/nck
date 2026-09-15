import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withTiming } from "@/lib/timing";

export const getRequestSupabaseAuth = cache(async function getRequestSupabaseAuth() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      supabase: null,
      user: null,
      error: null
    };
  }

  const {
    data: { user },
    error
  } = await withTiming("supabase.auth", "getUser", async () => supabase.auth.getUser());

  return {
    supabase,
    user,
    error
  };
});
