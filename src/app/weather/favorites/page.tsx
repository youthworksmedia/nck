import { WeatherFavoritesView } from "@/components/weather-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadFavoriteSummaries } from "@/lib/weather";

export default async function WeatherFavoritesPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <WeatherFavoritesView favorites={[]} />;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const favorites = user ? await loadFavoriteSummaries(supabase, user.id).catch(() => []) : [];

  return <WeatherFavoritesView favorites={favorites} />;
}
