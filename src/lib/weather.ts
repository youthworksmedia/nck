import { z } from "zod";

import { serverEnv } from "@/lib/env";
import type {
  AccuracyScore,
  FavoriteSummary,
  ForecastBundle,
  ForecastRecord,
  LocationRecord,
  ObservationRecord,
  PlaceSearchResult,
  ProviderMetadata,
  WeatherSettings,
  WeatherProvider,
  WeatherResponse
} from "@/types/weather";

const yrResponseSchema = z.object({
  properties: z.object({
    meta: z
      .object({
        updated_at: z.string().optional()
      })
      .optional(),
    timeseries: z.array(
      z.object({
        time: z.string(),
        data: z.object({
          instant: z.object({
            details: z.object({
              air_temperature: z.number().nullable().optional(),
              wind_speed: z.number().nullable().optional()
            })
          }),
          next_1_hours: z
            .object({
              summary: z.object({
                symbol_code: z.string().optional()
              }),
              details: z.object({
                precipitation_amount: z.number().nullable().optional(),
                probability_of_precipitation: z.number().nullable().optional()
              })
            })
            .optional(),
          next_6_hours: z
            .object({
              details: z.object({
                precipitation_amount: z.number().nullable().optional(),
                probability_of_precipitation: z.number().nullable().optional()
              })
            })
            .optional()
        })
      })
    )
  })
});

const openMeteoSchema = z.object({
  timezone: z.string().optional(),
  current: z
    .object({
      time: z.string().optional(),
      temperature_2m: z.number().nullable().optional(),
      rain: z.number().nullable().optional(),
      wind_speed_10m: z.number().nullable().optional()
    })
    .optional(),
  daily: z
    .object({
      time: z.array(z.string()).default([]),
      temperature_2m_max: z.array(z.number().nullable()).default([]),
      precipitation_sum: z.array(z.number().nullable()).default([]),
      wind_speed_10m_max: z.array(z.number().nullable()).default([])
    })
    .optional()
});

const providerMetadata: Record<WeatherProvider, ProviderMetadata> = {
  YR: {
    provider: "YR",
    label: "YR.no",
    attribution: "Data from MET Norway",
    attributionUrl: "https://www.yr.no/en/content/terms"
  },
  BOM: {
    provider: "BOM",
    label: "BOM via Open-Meteo",
    attribution: "BOM-derived data delivered by Open-Meteo",
    attributionUrl: "https://open-meteo.com/"
  }
};

const weatherUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().nullable().optional()
});

const locationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  favorited: z.boolean(),
  user_id: z.string().uuid(),
  created_at: z.string().optional()
});

const forecastRowSchema = z.object({
  provider: z.enum(["YR", "BOM"]),
  forecast_for_date: z.string(),
  predicted_temp: z.number().nullable(),
  predicted_rain: z.number().nullable(),
  predicted_wind: z.number().nullable(),
  raw_data: z.unknown().optional()
});

const observationRowSchema = z.object({
  observed_date: z.string(),
  actual_temp: z.number().nullable(),
  actual_rain: z.number().nullable(),
  actual_wind: z.number().nullable(),
  raw_data: z.unknown().optional()
});

const forecastInsertSchema = z.object({
  location_id: z.string().uuid(),
  provider: z.enum(["YR", "BOM"]),
  forecast_for_date: z.string(),
  predicted_temp: z.number().nullable(),
  predicted_rain: z.number().nullable(),
  predicted_wind: z.number().nullable(),
  raw_data: z.unknown().optional()
});

const observationInsertSchema = z.object({
  location_id: z.string().uuid(),
  observed_date: z.string(),
  actual_temp: z.number().nullable(),
  actual_rain: z.number().nullable(),
  actual_wind: z.number().nullable(),
  raw_data: z.unknown().optional()
});

const favoritesQuerySchema = z.object({
  user_id: z.string().uuid()
});

const openMeteoPlaceSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).transform((value) => String(value)),
        name: z.string(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string().optional()
      })
    )
    .optional()
});

export const WEATHER_DEFAULT_TIMEZONE = "Australia/Sydney";
export const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  units: "metric",
  preferredProvider: "auto",
  offlineCaching: true
};

export function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}

function normalizeDate(input: string) {
  return input.slice(0, 10);
}

function buildYrUserAgent() {
  const appName = serverEnv.weatherAppName || "MultiSourceWeatherApp";
  const contact = serverEnv.weatherContactEmail || "weather@example.com";

  return `${appName}/1.0 (${contact})`;
}

async function fetchJson<T>(url: string, init?: RequestInit, schema?: z.ZodSchema<T>) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers
    },
    next: {
      revalidate: 60 * 60,
      ...init?.next
    }
  });

  if (!response.ok) {
    throw new Error(`Weather provider request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  return schema ? schema.parse(data) : (data as T);
}

function pickDailyForecasts(
  provider: WeatherProvider,
  timeseries: Array<{
    time: string;
    temp: number | null;
    rain: number | null;
    wind: number | null;
    rawData?: unknown;
  }>
) {
  const byDay = new Map<string, ForecastRecord>();

  for (const entry of timeseries) {
    const day = normalizeDate(entry.time);

    if (!byDay.has(day)) {
      byDay.set(day, {
        provider,
        forecastForDate: day,
        predictedTemp: entry.temp,
        predictedRain: entry.rain,
        predictedWind: entry.wind,
        rawData: entry.rawData
      });
    }
  }

  return [...byDay.values()].slice(0, 7);
}

export async function fetchYrForecast(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<ForecastBundle> {
  const lat = roundCoordinate(latitude);
  const lon = roundCoordinate(longitude);
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const data = await fetchJson(url, {
    headers: {
      "User-Agent": buildYrUserAgent()
    }
  }, yrResponseSchema);

  const series = data.properties.timeseries;
  const currentSlice = series[0];
  const current = {
    temperature: currentSlice?.data.instant.details.air_temperature ?? null,
    rain:
      currentSlice?.data.next_1_hours?.details.probability_of_precipitation ??
      currentSlice?.data.next_1_hours?.details.precipitation_amount ??
      null,
    wind: currentSlice?.data.instant.details.wind_speed ?? null,
    summary: currentSlice?.data.next_1_hours?.summary.symbol_code ?? "Forecast",
    asOf: data.properties.meta?.updated_at ?? currentSlice?.time ?? null
  };

  const daily = pickDailyForecasts(
    "YR",
    series.map((entry) => ({
      time: entry.time,
      temp: entry.data.instant.details.air_temperature ?? null,
      rain:
        entry.data.next_6_hours?.details.probability_of_precipitation ??
        entry.data.next_6_hours?.details.precipitation_amount ??
        entry.data.next_1_hours?.details.probability_of_precipitation ??
        entry.data.next_1_hours?.details.precipitation_amount ??
        null,
      wind: entry.data.instant.details.wind_speed ?? null,
      rawData: entry
    }))
  );

  return {
    provider: providerMetadata.YR,
    current,
    daily
  };
}

export async function fetchBomForecast(
  latitude: number,
  longitude: number,
  timezone = WEATHER_DEFAULT_TIMEZONE
): Promise<ForecastBundle> {
  const url = new URL(serverEnv.weatherBomBaseUrl || "https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(roundCoordinate(latitude)));
  url.searchParams.set("longitude", String(roundCoordinate(longitude)));
  url.searchParams.set("current", "temperature_2m,rain,wind_speed_10m");
  url.searchParams.set(
    "daily",
    "temperature_2m_max,precipitation_sum,wind_speed_10m_max"
  );
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("models", serverEnv.weatherBomModel || "bom_access_global");

  const data = await fetchJson(url.toString(), undefined, openMeteoSchema);
  const days = data.daily?.time ?? [];
  const temperatures = data.daily?.temperature_2m_max ?? [];
  const precipitation = data.daily?.precipitation_sum ?? [];
  const wind = data.daily?.wind_speed_10m_max ?? [];

  return {
    provider: providerMetadata.BOM,
    current: {
      temperature: data.current?.temperature_2m ?? null,
      rain: data.current?.rain ?? null,
      wind: data.current?.wind_speed_10m ?? null,
      summary: "BOM-backed model",
      asOf: data.current?.time ?? null
    },
    daily: days.map((day, index) => ({
      provider: "BOM",
      forecastForDate: day,
      predictedTemp: temperatures[index] ?? null,
      predictedRain: precipitation[index] ?? null,
      predictedWind: wind[index] ?? null,
      rawData: {
        time: day,
        temperature_2m_max: temperatures[index] ?? null,
        precipitation_sum: precipitation[index] ?? null,
        wind_speed_10m_max: wind[index] ?? null
      }
    }))
  };
}

export async function fetchWeatherForLocation(input: {
  latitude: number;
  longitude: number;
  name?: string;
  timezone?: string;
}): Promise<WeatherResponse> {
  const timezone = input.timezone || WEATHER_DEFAULT_TIMEZONE;
  const [yr, bom] = await Promise.all([
    fetchYrForecast(input.latitude, input.longitude, input.name),
    fetchBomForecast(input.latitude, input.longitude, timezone)
  ]);

  return {
    location: {
      name: input.name,
      latitude: roundCoordinate(input.latitude),
      longitude: roundCoordinate(input.longitude),
      timezone
    },
    providers: [yr, bom],
    requestedAt: new Date().toISOString()
  };
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const data = await fetchJson(url.toString(), undefined, openMeteoPlaceSchema);
  return (data.results ?? []).map((result) => ({
    ...result,
    id: String(result.id)
  }));
}

export function computeTemperatureAccuracy(predictedTemp: number | null, actualTemp: number | null) {
  if (predictedTemp === null || actualTemp === null) {
    return 0;
  }

  const error = Math.abs(predictedTemp - actualTemp);
  return Math.max(0, Math.round((100 - error * 8) * 100) / 100);
}

export function computeRainAccuracy(predictedRain: number | null, actualRain: number | null) {
  const predictedWet = (predictedRain ?? 0) > 0.5;
  const actualWet = (actualRain ?? 0) > 0;
  return predictedWet === actualWet ? 100 : 0;
}

export function combineAccuracy(tempAccuracy: number, rainAccuracy: number) {
  return Math.round((tempAccuracy * 0.65 + rainAccuracy * 0.35) * 100) / 100;
}

export function computeAccuracyScores(
  forecasts: ForecastRecord[],
  observations: ObservationRecord[]
): AccuracyScore[] {
  const observationsByDate = new Map(
    observations.map((entry) => [normalizeDate(entry.observedDate), entry])
  );
  const grouped = new Map<WeatherProvider, Array<{ forecast: ForecastRecord; observation: ObservationRecord }>>();

  for (const forecast of forecasts) {
    const observation = observationsByDate.get(normalizeDate(forecast.forecastForDate));

    if (!observation) {
      continue;
    }

    const bucket = grouped.get(forecast.provider) ?? [];
    bucket.push({ forecast, observation });
    grouped.set(forecast.provider, bucket);
  }

  return [...grouped.entries()].map(([provider, entries]) => {
    const tempScores = entries.map(({ forecast, observation }) =>
      computeTemperatureAccuracy(forecast.predictedTemp, observation.actualTemp)
    );
    const rainScores = entries.map(({ forecast, observation }) =>
      computeRainAccuracy(forecast.predictedRain, observation.actualRain)
    );
    const tempAccuracy = average(tempScores);
    const rainAccuracy = average(rainScores);

    return {
      provider,
      tempAccuracy,
      rainAccuracy,
      combinedScore: combineAccuracy(tempAccuracy, rainAccuracy),
      sampleSize: entries.length,
      lastUpdated: new Date().toISOString()
    };
  });
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export function mapLocationRow(row: z.infer<typeof locationSchema>): LocationRecord {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    favorited: row.favorited,
    userId: row.user_id,
    createdAt: row.created_at
  };
}

export function mapForecastRow(row: z.infer<typeof forecastRowSchema>): ForecastRecord {
  return {
    provider: row.provider,
    forecastForDate: row.forecast_for_date,
    predictedTemp: row.predicted_temp,
    predictedRain: row.predicted_rain,
    predictedWind: row.predicted_wind,
    rawData: row.raw_data
  };
}

export function mapObservationRow(row: z.infer<typeof observationRowSchema>): ObservationRecord {
  return {
    observedDate: row.observed_date,
    actualTemp: row.actual_temp,
    actualRain: row.actual_rain,
    actualWind: row.actual_wind,
    rawData: row.raw_data
  };
}

export function getWeatherProviderMetadata() {
  return Object.values(providerMetadata);
}

export function reorderProviders(
  providers: ForecastBundle[],
  preferredProvider: WeatherSettings["preferredProvider"]
) {
  if (preferredProvider === "auto") {
    return providers;
  }

  return [...providers].sort((left, right) => {
    if (left.provider.provider === preferredProvider) {
      return -1;
    }

    if (right.provider.provider === preferredProvider) {
      return 1;
    }

    return 0;
  });
}

export function buildForecastInserts(locationId: string, providers: ForecastBundle[]) {
  return forecastInsertSchema.array().parse(
    providers.flatMap((provider) =>
      provider.daily.map((entry) => ({
        location_id: locationId,
        provider: entry.provider,
        forecast_for_date: entry.forecastForDate,
        predicted_temp: entry.predictedTemp,
        predicted_rain: entry.predictedRain,
        predicted_wind: entry.predictedWind,
        raw_data: entry.rawData
      }))
    )
  );
}

export function buildObservationInsert(locationId: string, provider: ForecastBundle) {
  const today = provider.daily[0];

  return observationInsertSchema.parse({
    location_id: locationId,
    observed_date: today?.forecastForDate ?? new Date().toISOString().slice(0, 10),
    actual_temp: provider.current.temperature,
    actual_rain: provider.current.rain,
    actual_wind: provider.current.wind,
    raw_data: provider
  });
}

export function resolveFavoriteLocationName(name: string | undefined, latitude: number, longitude: number) {
  if (name?.trim()) {
    return name.trim();
  }

  return `Saved place ${roundCoordinate(latitude)}, ${roundCoordinate(longitude)}`;
}

export function parseLocationInput(payload: unknown) {
  return z
    .object({
      name: z.string().trim().optional(),
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      timezone: z.string().trim().optional(),
      userId: z.string().uuid().optional()
    })
    .parse(payload);
}

export function parseWeatherQuery(url: URL) {
  return z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
      name: z.string().optional(),
      timezone: z.string().optional()
    })
    .parse({
      lat: url.searchParams.get("lat"),
      lon: url.searchParams.get("lon"),
      name: url.searchParams.get("name") ?? undefined,
      timezone: url.searchParams.get("timezone") ?? undefined
    });
}

export function parseAccuracyQuery(url: URL) {
  return z
    .object({
      location_id: z.string().uuid()
    })
    .parse({
      location_id: url.searchParams.get("location_id")
    });
}

export function parseFavoritesQuery(url: URL) {
  return favoritesQuerySchema.parse({
    user_id: url.searchParams.get("user_id")
  });
}

export async function ensureWeatherUser(
  supabase: any,
  userId: string,
  email?: string | null
) {
  const payload = weatherUserSchema.parse({
    id: userId,
    email: email ?? null
  });
  const { error } = await supabase.from("users").upsert(payload, {
    onConflict: "id"
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadFavoriteSummaries(
  supabase: any,
  userId: string
): Promise<FavoriteSummary[]> {
  const { data: locationRows, error: locationsError } = await supabase
    .from("locations")
    .select("id, name, latitude, longitude, favorited, user_id, created_at")
    .eq("user_id", userId)
    .eq("favorited", true)
    .order("created_at", { ascending: false });

  if (locationsError) {
    throw new Error(locationsError.message);
  }

  const parsedLocations = z.array(locationSchema).parse(locationRows ?? []).map(mapLocationRow);
  const favorites = await Promise.all(
    parsedLocations.map(async (location) => {
      const [live, accuracy] = await Promise.all([
        fetchWeatherForLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name
        }),
        loadAccuracyForLocation(supabase, location.id)
      ]);

      return {
        location,
        providers: live.providers,
        accuracy
      };
    })
  );

  return favorites;
}

export async function loadAccuracyForLocation(supabase: any, locationId: string) {
  const [{ data: forecastRows, error: forecastsError }, { data: observationRows, error: observationsError }] =
    await Promise.all([
      supabase
        .from("forecasts")
        .select("provider, forecast_for_date, predicted_temp, predicted_rain, predicted_wind, raw_data")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("observations")
        .select("observed_date, actual_temp, actual_rain, actual_wind, raw_data")
        .eq("location_id", locationId)
        .order("observed_date", { ascending: false })
    ]);

  if (forecastsError) {
    throw new Error(forecastsError.message);
  }

  if (observationsError) {
    throw new Error(observationsError.message);
  }

  const forecasts = z.array(forecastRowSchema).parse(forecastRows ?? []).map(mapForecastRow);
  const observations = z.array(observationRowSchema)
    .parse(observationRows ?? [])
    .map(mapObservationRow);
  const computed = computeAccuracyScores(forecasts, observations);

  if (computed.length) {
    const rows = computed.map((entry) => ({
      location_id: locationId,
      provider: entry.provider,
      temp_accuracy: entry.tempAccuracy,
      rain_accuracy: entry.rainAccuracy,
      combined_score: entry.combinedScore,
      sample_size: entry.sampleSize,
      last_updated: entry.lastUpdated
    }));

    const { error } = await supabase.from("accuracy_scores").upsert(rows, {
      onConflict: "location_id,provider"
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  return computed;
}
