function resolveSiteUrl() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const vercelSiteUrl = vercelUrl ? `https://${vercelUrl}` : "";

  if (explicitSiteUrl && !explicitSiteUrl.includes("localhost")) {
    return explicitSiteUrl;
  }

  return vercelSiteUrl || explicitSiteUrl || "http://localhost:3001";
}

export const publicEnv = {
  siteUrl: resolveSiteUrl(),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export const hasSupabaseEnv = Boolean(
  publicEnv.siteUrl && publicEnv.supabaseUrl && publicEnv.supabaseAnonKey
);
