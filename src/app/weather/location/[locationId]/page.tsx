import { notFound } from "next/navigation";

import { WeatherDetailView } from "@/components/weather-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadFavoriteSummaries } from "@/lib/weather";

export default async function WeatherLocationDetailPage({
  params
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    notFound();
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const favorites = await loadFavoriteSummaries(supabase, user.id).catch(() => []);
  const favorite = favorites.find((entry) => entry.location.id === locationId);

  if (!favorite) {
    notFound();
  }

  return <WeatherDetailView favorite={favorite} />;
}
