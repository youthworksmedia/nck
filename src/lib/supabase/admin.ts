import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";

export function createSupabaseAdminClient() {
  if (!serverEnv.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
