import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildObservationInsert, fetchWeatherForLocation } from "@/lib/weather";

export async function POST(request: Request) {
  try {
    if (
      serverEnv.weatherCronSecret &&
      request.headers.get("x-weather-cron-secret") !== serverEnv.weatherCronSecret
    ) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase admin client is required." }, { status: 500 });
    }

    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("id, name, latitude, longitude, favorited")
      .eq("favorited", true);

    if (locationsError) {
      throw new Error(locationsError.message);
    }

    const results = [];

    for (const location of locations ?? []) {
      const weather = await fetchWeatherForLocation({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        name: location.name
      });
      const preferredProvider = weather.providers.find((entry) => entry.provider.provider === "BOM") ?? weather.providers[0];
      const payload = buildObservationInsert(location.id, preferredProvider);
      const { error } = await supabase.from("observations").insert(payload);

      if (error) {
        throw new Error(error.message);
      }

      results.push({
        locationId: location.id,
        observedDate: payload.observed_date
      });
    }

    return NextResponse.json({ loggedAt: new Date().toISOString(), results });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not log observations." },
      { status: 400 }
    );
  }
}
