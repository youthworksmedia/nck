export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export const hasSupabaseEnv = Boolean(
  publicEnv.siteUrl && publicEnv.supabaseUrl && publicEnv.supabaseAnonKey
);
