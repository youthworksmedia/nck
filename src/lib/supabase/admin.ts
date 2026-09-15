import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";

let adminClient: SupabaseClient<any, "nck", any> | null = null;

export function createSupabaseAdminClient() {
  if (!serverEnv.supabaseServiceRoleKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
      db: {
        schema: "nck"
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
}
