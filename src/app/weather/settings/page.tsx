import { WeatherSettingsClient } from "@/components/weather-settings-client";
import { WeatherSettingsView } from "@/components/weather-shell";

export default function WeatherSettingsPage() {
  return (
    <WeatherSettingsView>
      <WeatherSettingsClient />
    </WeatherSettingsView>
  );
}
