// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL");
const cronSecret = Deno.env.get("WEATHER_CRON_SECRET");

serve(async () => {
  if (!siteUrl || !cronSecret) {
    return new Response(
      JSON.stringify({
        message: "NEXT_PUBLIC_SITE_URL and WEATHER_CRON_SECRET are required."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const response = await fetch(`${siteUrl}/api/logObservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-weather-cron-secret": cronSecret
    }
  });
  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
});
