import { WeatherHomeClient } from "@/components/weather-home-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchWeatherForLocation, loadFavoriteSummaries } from "@/lib/weather";
import type { FavoriteSummary } from "@/types/weather";

const previewFavorites: FavoriteSummary[] = [];

export default async function WeatherPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const initialFavorites =
    supabase && user
      ? await loadFavoriteSummaries(supabase, user.id).catch(() => previewFavorites)
      : previewFavorites;
  const preview = await fetchWeatherForLocation({
    latitude: -33.8688,
    longitude: 151.2093,
    name: "Sydney"
  }).catch(() => ({
    location: {
      name: "Sydney",
      latitude: -33.8688,
      longitude: 151.2093,
      timezone: "Australia/Sydney"
    },
    providers: [],
    requestedAt: new Date().toISOString()
  }));

  return (
    <WeatherHomeClient
      initialPreview={preview}
      initialFavorites={initialFavorites}
      userId={user?.id ?? null}
    />
  );
}
