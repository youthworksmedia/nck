"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";

import styles from "@/components/weather-shell.module.css";
import {
  getDevicePosition,
  isNativeApp,
  readPreference,
  removePreference,
  writePreference
} from "@/lib/capacitor";
import {
  DEFAULT_WEATHER_SETTINGS,
  WEATHER_DEFAULT_TIMEZONE,
  reorderProviders
} from "@/lib/weather";
import type {
  AccuracyScore,
  FavoriteSummary,
  ForecastBundle,
  PlaceSearchResult,
  WeatherProvider,
  WeatherResponse,
  WeatherSettings
} from "@/types/weather";

const settingsStorageKey = "weather-settings-v1";
const previewStorageKey = "weather-preview-v1";
const favoritesStorageKey = "weather-favorites-v1";
const recentPlacesStorageKey = "weather-recent-places-v1";
const serviceWorkerPath = "/weather-sw.js";

type RecentPlace = {
  id: string;
  locationId?: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  providers: ForecastBundle[];
  accuracy: AccuracyScore[];
  lastViewedAt: string;
  favorited: boolean;
};

function weatherIcon(summary: string) {
  const value = summary.toLowerCase();

  if (value.includes("thunder")) return "⛈";
  if (value.includes("snow") || value.includes("sleet")) return "❄";
  if (value.includes("rain") || value.includes("shower")) return "🌧";
  if (value.includes("fog")) return "🌫";
  if (value.includes("cloud")) return "☁";
  if (value.includes("clear") || value.includes("fair") || value.includes("sun")) return "☀";

  return "⛅";
}

function humanSummary(summary: string, rain: number | null) {
  const value = summary.replaceAll("_", " ").trim();

  if (value && value !== "BOM-backed model" && value !== "Forecast") {
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if ((rain ?? 0) > 4) {
    return "Wet and unsettled";
  }

  if ((rain ?? 0) > 1) {
    return "Chance of rain";
  }

  return "Mostly settled";
}

function confidenceLabel(score?: number) {
  if (score === undefined) return "Learning";
  if (score >= 85) return "Very likely";
  if (score >= 70) return "Likely";
  if (score >= 55) return "Possible";
  return "Low confidence";
}

function confidenceTone(score?: number) {
  if (score === undefined) return styles.toneNeutral;
  if (score >= 85) return styles.toneHigh;
  if (score >= 70) return styles.toneGood;
  if (score >= 55) return styles.toneMid;
  return styles.toneLow;
}

function formatValue(value: number | null, suffix: string, units: WeatherSettings["units"]) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  if (suffix === "C" && units === "imperial") {
    return `${Math.round((((value * 9) / 5 + 32) * 10)) / 10}F`;
  }

  if (suffix === " km/h" && units === "imperial") {
    return `${Math.round((value * 0.621371) * 10) / 10} mph`;
  }

  if (suffix === " mm" && units === "imperial") {
    return `${Math.round((value / 25.4) * 100) / 100} in`;
  }

  return `${Math.round(value * 10) / 10}${suffix}`;
}

function findAccuracy(accuracy: AccuracyScore[], provider: WeatherProvider) {
  return accuracy.find((entry) => entry.provider === provider);
}

function placeKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function formatLastViewed(lastViewedAt: string) {
  const date = new Date(lastViewedAt);

  if (Number.isNaN(date.getTime())) {
    return "Recently viewed";
  }

  return date.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

function toRecentPlace(
  weather: WeatherResponse,
  accuracy: AccuracyScore[],
  options?: {
    favorited?: boolean;
    locationId?: string;
    lastViewedAt?: string;
  }
): RecentPlace {
  return {
    id:
      options?.locationId ??
      `${weather.location.name ?? "place"}-${placeKey(
        weather.location.latitude,
        weather.location.longitude
      )}`,
    locationId: options?.locationId,
    name: weather.location.name ?? "Recent place",
    latitude: weather.location.latitude,
    longitude: weather.location.longitude,
    timezone: weather.location.timezone,
    providers: weather.providers,
    accuracy,
    lastViewedAt: options?.lastViewedAt ?? new Date().toISOString(),
    favorited: options?.favorited ?? false
  };
}

function favoriteToRecentPlace(favorite: FavoriteSummary): RecentPlace {
  return {
    id: favorite.location.id,
    locationId: favorite.location.id,
    name: favorite.location.name,
    latitude: favorite.location.latitude,
    longitude: favorite.location.longitude,
    timezone: WEATHER_DEFAULT_TIMEZONE,
    providers: favorite.providers,
    accuracy: favorite.accuracy,
    lastViewedAt: favorite.location.createdAt ?? new Date().toISOString(),
    favorited: true
  };
}

async function readJsonStorage<T>(key: string, fallback: T) {
  try {
    const raw = await readPreference(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJsonStorage(key: string, value: unknown) {
  await writePreference(key, JSON.stringify(value));
}

async function readResponseJson<T>(response: Response) {
  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
}

function mergeRecentPlaces(recent: RecentPlace[], additions: RecentPlace[]) {
  const merged = new Map<string, RecentPlace>();

  for (const entry of [...additions, ...recent]) {
    merged.set(placeKey(entry.latitude, entry.longitude), entry);
  }

  return [...merged.values()]
    .sort((left, right) => right.lastViewedAt.localeCompare(left.lastViewedAt))
    .slice(0, 8);
}

function TemperatureBars({
  provider,
  units
}: {
  provider: ForecastBundle;
  units: WeatherSettings["units"];
}) {
  const temps = provider.daily
    .slice(0, 5)
    .map((entry) => entry.predictedTemp)
    .filter((value): value is number => value !== null);

  const min = temps.length ? Math.min(...temps) : 0;
  const max = temps.length ? Math.max(...temps) : 1;
  const range = Math.max(max - min, 1);

  return (
    <div className={styles.tempChart}>
      {provider.daily.slice(0, 5).map((entry) => {
        const temp = entry.predictedTemp ?? min;
        const height = 34 + ((temp - min) / range) * 58;

        return (
          <div key={`${provider.provider.provider}-${entry.forecastForDate}`} className={styles.tempBarWrap}>
            <span className={styles.dayLabel}>
              {new Date(entry.forecastForDate).toLocaleDateString("en-AU", {
                weekday: "short"
              })}
            </span>
            <div className={styles.tempBarTrack}>
              <div className={styles.tempBar} style={{ height: `${height}px` }} />
            </div>
            <strong className={styles.chartValue}>{formatValue(entry.predictedTemp, "C", units)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function RainBars({
  provider,
  units
}: {
  provider: ForecastBundle;
  units: WeatherSettings["units"];
}) {
  const rains = provider.daily
    .slice(0, 5)
    .map((entry) => entry.predictedRain ?? 0);
  const max = Math.max(...rains, 1);

  return (
    <div className={styles.rainChart}>
      {provider.daily.slice(0, 5).map((entry) => {
        const rain = entry.predictedRain ?? 0;
        const width = 16 + (rain / max) * 84;

        return (
          <div key={`${provider.provider.provider}-${entry.forecastForDate}-rain`} className={styles.rainBarRow}>
            <span className={styles.dayLabel}>
              {new Date(entry.forecastForDate).toLocaleDateString("en-AU", {
                weekday: "short"
              })}
            </span>
            <div className={styles.rainBarTrack}>
              <div className={styles.rainBar} style={{ width: `${width}%` }} />
            </div>
            <strong className={styles.chartValue}>{formatValue(rain, " mm", units)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function ForecastPanel({
  place,
  units,
  preferredProvider
}: {
  place: RecentPlace;
  units: WeatherSettings["units"];
  preferredProvider: WeatherSettings["preferredProvider"];
}) {
  const providers = reorderProviders(place.providers, preferredProvider);

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedHeader}>
        <div>
          <span className={styles.compactMeta}>Expanded analysis</span>
          <strong>{place.name}</strong>
        </div>
        <span className={styles.compactMeta}>{formatLastViewed(place.lastViewedAt)}</span>
      </div>

      <div className={styles.expandedProviders}>
        {providers.map((provider) => {
          const trust = findAccuracy(place.accuracy, provider.provider.provider);
          const confidence = confidenceLabel(trust?.combinedScore);

          return (
            <section key={provider.provider.provider} className={styles.providerDetailCard}>
              <div className={styles.providerDetailHeader}>
                <div>
                  <strong>
                    {weatherIcon(provider.current.summary)} {provider.provider.label}
                  </strong>
                  <p className={styles.subtle}>
                    {humanSummary(provider.current.summary, provider.current.rain)}
                  </p>
                </div>
                <div className={`${styles.confidenceBadge} ${confidenceTone(trust?.combinedScore)}`}>
                  <span>{confidence}</span>
                  <strong>{trust ? `${trust.combinedScore}%` : "New"}</strong>
                </div>
              </div>

              <div className={styles.providerStatGrid}>
                <div className={styles.dataTile}>
                  <span>Current</span>
                  <strong>{formatValue(provider.current.temperature, "C", units)}</strong>
                  <small>{weatherIcon(provider.current.summary)} {humanSummary(provider.current.summary, provider.current.rain)}</small>
                </div>
                <div className={styles.dataTile}>
                  <span>Rain outlook</span>
                  <strong>{formatValue(provider.current.rain, " mm", units)}</strong>
                  <small>Expected precipitation now</small>
                </div>
                <div className={styles.dataTile}>
                  <span>Wind</span>
                  <strong>{formatValue(provider.current.wind, " km/h", units)}</strong>
                  <small>Current movement</small>
                </div>
              </div>

              <div className={styles.insightGrid}>
                <div className={styles.chartCard}>
                  <div className={styles.chartHead}>
                    <strong>Temperature trend</strong>
                    <span className={styles.compactMeta}>5 day view</span>
                  </div>
                  <TemperatureBars provider={provider} units={units} />
                </div>

                <div className={styles.chartCard}>
                  <div className={styles.chartHead}>
                    <strong>Rain profile</strong>
                    <span className={styles.compactMeta}>Daily totals</span>
                  </div>
                  <RainBars provider={provider} units={units} />
                </div>
              </div>

              <div className={styles.forecastStrip}>
                {provider.daily.slice(0, 5).map((entry) => (
                  <div
                    key={`${provider.provider.provider}-${entry.forecastForDate}`}
                    className={styles.forecastMiniCard}
                  >
                    <span className={styles.dayLabel}>
                      {new Date(entry.forecastForDate).toLocaleDateString("en-AU", {
                        weekday: "short"
                      })}
                    </span>
                    <strong>
                      {weatherIcon(provider.current.summary)}{" "}
                      {formatValue(entry.predictedTemp, "C", units)}
                    </strong>
                    <span>{humanSummary(provider.current.summary, entry.predictedRain)}</span>
                    <span className={styles.compactMeta}>
                      Rain {formatValue(entry.predictedRain, " mm", units)}
                    </span>
                    <span className={`${styles.confidenceInline} ${confidenceTone(trust?.combinedScore)}`}>
                      {confidence}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PlaceRow({
  place,
  units,
  preferredProvider,
  expanded,
  onToggle,
  canSave,
  onSave
}: {
  place: RecentPlace;
  units: WeatherSettings["units"];
  preferredProvider: WeatherSettings["preferredProvider"];
  expanded: boolean;
  onToggle: () => void;
  canSave: boolean;
  onSave: () => void;
}) {
  const providers = reorderProviders(place.providers, preferredProvider);
  const leadProvider = providers[0];
  const bomTrust = findAccuracy(place.accuracy, "BOM");
  const yrTrust = findAccuracy(place.accuracy, "YR");
  const leadTrust = findAccuracy(
    place.accuracy,
    leadProvider?.provider.provider ?? "YR"
  )?.combinedScore;

  return (
    <article className={styles.placeRow}>
      <button type="button" className={styles.placeSummary} onClick={onToggle}>
        <div className={styles.placeMain}>
          <div className={styles.placeTitleGroup}>
            <span className={styles.placeIcon}>
              {weatherIcon(leadProvider?.current.summary ?? "")}
            </span>
            <div>
              <div className={styles.titleLine}>
                <strong>{place.name}</strong>
                <span
                  className={`${styles.trustBadge} ${confidenceTone(leadTrust)}`}
                >
                  {confidenceLabel(leadTrust)}
                </span>
              </div>
              <p className={styles.subtle}>
                {humanSummary(
                  leadProvider?.current.summary ?? "",
                  leadProvider?.current.rain ?? null
                )}
              </p>
            </div>
          </div>
          <div className={styles.placeAside}>
            <div className={styles.placeNow}>
              <strong>{formatValue(leadProvider?.current.temperature ?? null, "C", units)}</strong>
              <span>Current</span>
            </div>
            <span
              className={`${styles.expandArrow} ${expanded ? styles.expandArrowOpen : ""}`}
              aria-hidden="true"
            >
              <ChevronDown size={18} />
            </span>
          </div>
        </div>

        <div className={styles.overviewGrid}>
          <div className={styles.overviewTile}>
            <span>Weather</span>
            <strong>{weatherIcon(leadProvider?.current.summary ?? "")}</strong>
            <small>{leadProvider?.provider.label ?? "Provider"}</small>
          </div>
          <div className={styles.overviewTile}>
            <span>BOM trust</span>
            <strong>{bomTrust ? `${bomTrust.combinedScore}%` : "New"}</strong>
            <small>{confidenceLabel(bomTrust?.combinedScore)}</small>
          </div>
          <div className={styles.overviewTile}>
            <span>YR trust</span>
            <strong>{yrTrust ? `${yrTrust.combinedScore}%` : "New"}</strong>
            <small>{confidenceLabel(yrTrust?.combinedScore)}</small>
          </div>
          <div className={styles.overviewTile}>
            <span>Rain now</span>
            <strong>{formatValue(leadProvider?.current.rain ?? null, " mm", units)}</strong>
            <small>{place.favorited ? "Tracked place" : "Recent search"}</small>
          </div>
        </div>

        <div className={styles.miniChartRow}>
          {providers.slice(0, 2).map((provider) => (
            <div key={provider.provider.provider} className={styles.miniChartCard}>
              <div className={styles.miniChartHead}>
                <strong>{provider.provider.provider}</strong>
                <span className={styles.compactMeta}>
                  {findAccuracy(place.accuracy, provider.provider.provider)?.combinedScore ?? "New"}
                  {typeof findAccuracy(place.accuracy, provider.provider.provider)?.combinedScore === "number"
                    ? "%"
                    : ""}
                </span>
              </div>
              <TemperatureBars provider={provider} units={units} />
            </div>
          ))}
        </div>

        <div className={styles.placeMetaRow}>
          <span className={styles.compactMeta}>Viewed {formatLastViewed(place.lastViewedAt)}</span>
          <span className={styles.compactMeta}>{place.timezone}</span>
        </div>
      </button>

      <div className={styles.placeActions}>
        {!place.favorited && canSave ? (
          <button type="button" className={styles.saveButton} onClick={onSave}>
            Save
          </button>
        ) : null}
      </div>

      {expanded ? (
        <ForecastPanel
          place={place}
          units={units}
          preferredProvider={preferredProvider}
        />
      ) : null}
    </article>
  );
}

export function WeatherHomeClient({
  initialPreview,
  initialFavorites,
  userId
}: {
  initialPreview: WeatherResponse;
  initialFavorites: FavoriteSummary[];
  userId: string | null;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [preview, setPreview] = useState(initialPreview);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const [settings, setSettings] = useState<WeatherSettings>(DEFAULT_WEATHER_SETTINGS);
  const [status, setStatus] = useState("Search for a place or use your current location.");
  const [isBusy, setIsBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStoredState() {
      const [storedSettings, storedPreview, storedFavorites, storedRecentPlaces] = await Promise.all([
        readJsonStorage(settingsStorageKey, DEFAULT_WEATHER_SETTINGS),
        readJsonStorage(previewStorageKey, initialPreview),
        readJsonStorage(favoritesStorageKey, initialFavorites),
        readJsonStorage<RecentPlace[]>(recentPlacesStorageKey, [])
      ]);

      if (!isMounted) {
        return;
      }

      const initialRecent = mergeRecentPlaces(storedRecentPlaces, [
        ...storedFavorites.map(favoriteToRecentPlace),
        toRecentPlace(storedPreview, [], { lastViewedAt: storedPreview.requestedAt })
      ]);

      setSettings(storedSettings);
      setPreview(storedPreview);
      setFavorites(storedFavorites);
      setRecentPlaces(initialRecent);
      setExpandedId(null);
    }

    loadStoredState();

    return () => {
      isMounted = false;
    };
  }, [initialFavorites, initialPreview]);

  useEffect(() => {
    void writeJsonStorage(settingsStorageKey, settings);
  }, [settings]);

  useEffect(() => {
    if (settings.offlineCaching) {
      void Promise.all([
        writeJsonStorage(previewStorageKey, preview),
        writeJsonStorage(favoritesStorageKey, favorites),
        writeJsonStorage(recentPlacesStorageKey, recentPlaces)
      ]);
    } else {
      void Promise.all([
        removePreference(previewStorageKey),
        removePreference(favoritesStorageKey),
        removePreference(recentPlacesStorageKey)
      ]);
    }
  }, [favorites, preview, recentPlaces, settings.offlineCaching]);

  useEffect(() => {
    if (!settings.offlineCaching || isNativeApp()) {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(serviceWorkerPath).catch(() => undefined);
    }
  }, [settings.offlineCaching]);

  useEffect(() => {
    if (!deferredQuery.trim() || deferredQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(deferredQuery)}`, {
          signal: controller.signal
        });
        const payload = await readResponseJson<{ results: PlaceSearchResult[] }>(response);
        setResults(payload.results);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus(error instanceof Error ? error.message : "Could not search places.");
        }
      }
    }

    run();

    return () => controller.abort();
  }, [deferredQuery]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    startTransition(() => {
      fetch(`/api/favorites?user_id=${userId}`)
        .then((response) => readResponseJson<{ favorites: FavoriteSummary[] }>(response))
        .then((payload) => {
          setFavorites(payload.favorites);
          setRecentPlaces((current) =>
            mergeRecentPlaces(current, payload.favorites.map(favoriteToRecentPlace))
          );
        })
        .catch(() => undefined);
    });
  }, [userId]);

  const favoriteMap = useMemo(
    () =>
      new Map(
        favorites.map((favorite) => [
          placeKey(favorite.location.latitude, favorite.location.longitude),
          favorite
        ])
      ),
    [favorites]
  );

  const visiblePlaces = useMemo(() => {
    const previewRecent = toRecentPlace(
      preview,
      favoriteMap.get(placeKey(preview.location.latitude, preview.location.longitude))?.accuracy ?? [],
      {
        locationId:
          favoriteMap.get(placeKey(preview.location.latitude, preview.location.longitude))?.location.id,
        favorited: Boolean(
          favoriteMap.get(placeKey(preview.location.latitude, preview.location.longitude))
        ),
        lastViewedAt: preview.requestedAt
      }
    );

    return mergeRecentPlaces(recentPlaces, [
      previewRecent,
      ...favorites.map(favoriteToRecentPlace)
    ]).map((place) => {
      const matchingFavorite = favoriteMap.get(placeKey(place.latitude, place.longitude));

      if (!matchingFavorite) {
        return place;
      }

      return {
        ...place,
        locationId: matchingFavorite.location.id,
        favorited: true,
        accuracy: matchingFavorite.accuracy.length ? matchingFavorite.accuracy : place.accuracy
      };
    });
  }, [favoriteMap, favorites, preview, recentPlaces]);

  async function loadWeather(place: PlaceSearchResult) {
    setIsBusy(true);
    setStatus(`Loading weather for ${place.name}...`);

    try {
      const response = await fetch(
        `/api/weather?lat=${place.latitude}&lon=${place.longitude}&name=${encodeURIComponent(
          place.name
        )}&timezone=${encodeURIComponent(place.timezone || WEATHER_DEFAULT_TIMEZONE)}`
      );
      const payload = await readResponseJson<WeatherResponse>(response);
      const matchingFavorite = favoriteMap.get(
        placeKey(payload.location.latitude, payload.location.longitude)
      );
      const nextRecent = toRecentPlace(payload, matchingFavorite?.accuracy ?? [], {
        locationId: matchingFavorite?.location.id,
        favorited: Boolean(matchingFavorite)
      });

      setPreview(payload);
      setRecentPlaces((current) => mergeRecentPlaces(current, [nextRecent]));
      setStatus(`Showing ${place.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load weather.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleSelectPlace(place: PlaceSearchResult) {
    setQuery(place.name);
    setResults([]);
    startTransition(() => {
      loadWeather(place);
    });
  }

  function handleUseLocation() {
    setIsBusy(true);
    setStatus("Requesting your location...");

    getDevicePosition()
      .then((position) => {
        const place: PlaceSearchResult = {
          id: "device-location",
          name: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        startTransition(() => {
          loadWeather(place);
        });
      })
      .catch((error: Error) => {
        setIsBusy(false);
        setStatus(error.message || "Could not access your location.");
      });
  }

  async function handleSaveFavorite(place: RecentPlace) {
    if (!userId) {
      setStatus("Sign in to save favorite locations.");
      return;
    }

    setIsBusy(true);
    setStatus("Saving favorite...");

    try {
      const response = await fetch("/api/favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone
        })
      });

      await readResponseJson<{ location: unknown }>(response);

      const favoritesResponse = await fetch(`/api/favorites?user_id=${userId}`);
      const favoritesPayload = await readResponseJson<{ favorites: FavoriteSummary[] }>(
        favoritesResponse
      );

      setFavorites(favoritesPayload.favorites);
      setRecentPlaces((current) =>
        mergeRecentPlaces(current, favoritesPayload.favorites.map(favoriteToRecentPlace))
      );
      setStatus("Favorite saved. Trust scores will sharpen as observations build.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save favorite.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.compactShell}>
        <section className={styles.compactHero}>
          <div className={styles.compactHeroTop}>
            <div>
              <span className={styles.eyebrow}>Mollersphere</span>
              <h1>Weather overview</h1>
              <p>Previous places first, then search to add a new place to the list.</p>
            </div>
            <div className={styles.inlineActions}>
              <Link href="/weather/settings" className={styles.settingsIconLink} aria-label="Open settings">
                <Settings size={18} />
              </Link>
            </div>
          </div>

          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search suburb, city, or region"
              aria-label="Search for a place"
            />
            <button
              type="button"
              className={styles.searchButton}
              disabled={isBusy || !results[0]}
              onClick={() => results[0] && handleSelectPlace(results[0])}
            >
              Search
            </button>
            <button
              type="button"
              className={styles.geoButton}
              disabled={isBusy}
              onClick={handleUseLocation}
            >
              Use location
            </button>
          </div>

          {results.length ? (
            <div className={styles.searchResults}>
              {results.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className={styles.searchResult}
                  onClick={() => handleSelectPlace(place)}
                >
                  <strong>{place.name}</strong>
                  <div>{[place.admin1, place.country].filter(Boolean).join(", ")}</div>
                </button>
              ))}
            </div>
          ) : null}

          <div className={styles.compactToolbar}>
            <p className={styles.status}>{status}</p>
          </div>
        </section>

        <section className={styles.compactList}>
          {visiblePlaces.map((place) => (
            <PlaceRow
              key={placeKey(place.latitude, place.longitude)}
              place={place}
              units={settings.units}
              preferredProvider={settings.preferredProvider}
              expanded={expandedId === place.id}
              onToggle={() =>
                setExpandedId((current) => (current === place.id ? null : place.id))
              }
              canSave={Boolean(userId)}
              onSave={() => void handleSaveFavorite(place)}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
