export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  hasExplicitSupabaseResourceBucket: Boolean(process.env.SUPABASE_RESOURCE_BUCKET),
  supabaseResourceBucket: process.env.SUPABASE_RESOURCE_BUCKET ?? "nck-resource-files",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePriceTierOne: process.env.STRIPE_PRICE_TIER_ONE ?? "",
  stripePriceTierTwo: process.env.STRIPE_PRICE_TIER_TWO ?? "",
  stripePriceTierThree: process.env.STRIPE_PRICE_TIER_THREE ?? "",
  weatherAppName: process.env.WEATHER_APP_NAME ?? "Mollersphere",
  weatherContactEmail: process.env.WEATHER_CONTACT_EMAIL ?? "",
  weatherBomBaseUrl: process.env.WEATHER_BOM_BASE_URL ?? "",
  weatherBomModel: process.env.WEATHER_BOM_MODEL ?? "bom_access_global",
  weatherCronSecret: process.env.WEATHER_CRON_SECRET ?? "",
  subscriptionCronSecret: process.env.SUBSCRIPTION_CRON_SECRET ?? process.env.CRON_SECRET ?? ""
};

export const hasStripeEnv = Boolean(
  serverEnv.stripeSecretKey &&
    serverEnv.stripePriceTierOne &&
    serverEnv.stripePriceTierTwo &&
    serverEnv.stripePriceTierThree
);
