import type { ReactNode } from "react";
import Link from "next/link";

import styles from "@/components/weather-shell.module.css";
import { WEATHER_DEFAULT_TIMEZONE, getWeatherProviderMetadata } from "@/lib/weather";
import type { AccuracyScore, FavoriteSummary, WeatherResponse } from "@/types/weather";

function formatValue(value: number | null, suffix: string) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value * 10) / 10}${suffix}`;
}

function TrustRow({ accuracy }: { accuracy: AccuracyScore[] }) {
  if (!accuracy.length) {
    return <p className={styles.subtle}>Trust scores appear after forecast history and observations build up.</p>;
  }

  return (
    <div className={styles.dailyList}>
      {accuracy.map((entry) => (
        <div key={entry.provider} className={styles.forecastRow}>
          <div className={styles.forecastHeader}>
            <strong>{entry.provider}</strong>
            <span>{entry.sampleSize} matched days</span>
          </div>
          <div className={styles.trustRow}>
            <div className={styles.trustPill}>
              <span>Combined</span>
              <strong>{entry.combinedScore}%</strong>
            </div>
            <div className={styles.trustPill}>
              <span>Temp</span>
              <strong>{entry.tempAccuracy}%</strong>
            </div>
            <div className={styles.trustPill}>
              <span>Rain</span>
              <strong>{entry.rainAccuracy}%</strong>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WeatherHomeView({
  preview,
  sampleFavorites
}: {
  preview: WeatherResponse;
  sampleFavorites: FavoriteSummary[];
}) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Multi-source weather</span>
          <h1>Forecasts you can compare, trust, and carry on Android.</h1>
          <p>
            Pull live outlooks from YR.no and BOM-backed data, save only the places that matter,
            and let trust scores grow as real observations come in.
          </p>
          <div className={styles.heroMeta}>
            <div className={styles.chip}>
              <strong>2 forecast sources</strong>
              <span>YR.no + BOM via Open-Meteo</span>
            </div>
            <div className={styles.chip}>
              <strong>3-6 hour logging</strong>
              <span>Forecast snapshots for favorites only</span>
            </div>
            <div className={styles.chip}>
              <strong>{WEATHER_DEFAULT_TIMEZONE}</strong>
              <span>Default timezone, override per request</span>
            </div>
          </div>
          <div className={styles.actions}>
            <Link href="/weather/favorites" className={styles.actionPrimary}>
              Open favorites
            </Link>
            <Link href="/weather/settings" className={styles.actionSecondary}>
              App settings
            </Link>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Live provider snapshot</h2>
            <div className={styles.providerList}>
              {preview.providers.map((provider) => (
                <article key={provider.provider.provider} className={styles.providerCard}>
                  <div className={styles.providerHeader}>
                    <div>
                      <strong>{provider.provider.label}</strong>
                      <p className={styles.subtle}>{provider.provider.attribution}</p>
                    </div>
                    <span>{provider.current.asOf?.slice(11, 16) ?? "Live"}</span>
                  </div>
                  <div className={styles.providerStatRow}>
                    <div className={styles.statPill}>
                      <span>Temp</span>
                      <strong>{formatValue(provider.current.temperature, "C")}</strong>
                    </div>
                    <div className={styles.statPill}>
                      <span>Rain</span>
                      <strong>{formatValue(provider.current.rain, "mm")}</strong>
                    </div>
                    <div className={styles.statPill}>
                      <span>Wind</span>
                      <strong>{formatValue(provider.current.wind, " km/h")}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Provider rules</h2>
            <div className={styles.settingsList}>
              {getWeatherProviderMetadata().map((provider) => (
                <div key={provider.provider} className={styles.settingRow}>
                  <strong>{provider.label}</strong>
                  <p className={styles.subtle}>{provider.attribution}</p>
                  <p className={styles.subtle}>Attribute visibly in-app and cache aggressively to respect provider guidance.</p>
                </div>
              ))}
              <div className={styles.settingRow}>
                <strong>Accuracy model</strong>
                <p className={styles.subtle}>Temperature uses absolute-error scoring; rain uses correct/incorrect thresholding; combined score is weighted 65/35.</p>
              </div>
            </div>
          </section>
        </div>

        <section className={`${styles.card} ${styles.fullWidth}`}>
          <h2 className={styles.sectionTitle}>Favorite locations preview</h2>
          <div className={styles.favoritesList}>
            {sampleFavorites.map((favorite) => (
              <article key={favorite.location.id} className={styles.favoriteRow}>
                <div className={styles.favoriteHeader}>
                  <div>
                    <strong>{favorite.location.name}</strong>
                    <p className={styles.subtle}>
                      {favorite.location.latitude}, {favorite.location.longitude}
                    </p>
                  </div>
                  <Link href={`/weather/location/${favorite.location.id}`}>View detail</Link>
                </div>
                <TrustRow accuracy={favorite.accuracy} />
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function WeatherFavoritesView({ favorites }: { favorites: FavoriteSummary[] }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Favorites</span>
          <h1>Swipe-worthy saved places, with trust tracking built in.</h1>
          <p>Only favorite locations get logged into history, so the app stays lightweight while accuracy keeps improving where you actually care.</p>
        </section>

        <section className={`${styles.card} ${styles.fullWidth}`}>
          <div className={styles.favoritesList}>
            {favorites.map((favorite) => (
              <article key={favorite.location.id} className={styles.favoriteRow}>
                <div className={styles.favoriteHeader}>
                  <div>
                    <strong>{favorite.location.name}</strong>
                    <p className={styles.subtle}>
                      {favorite.providers.map((provider) => provider.provider.label).join(" + ")}
                    </p>
                  </div>
                  <Link href={`/weather/location/${favorite.location.id}`}>Open</Link>
                </div>
                <TrustRow accuracy={favorite.accuracy} />
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function WeatherDetailView({
  favorite
}: {
  favorite: FavoriteSummary;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Location detail</span>
          <h1>{favorite.location.name}</h1>
          <p>
            Compare provider outputs side by side, inspect the next seven days, and use trust scores to decide which source has been more dependable for this place.
          </p>
        </section>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>7-day comparison</h2>
            <div className={styles.dailyList}>
              {favorite.providers.map((provider) => (
                <div key={provider.provider.provider} className={styles.providerCard}>
                  <div className={styles.providerHeader}>
                    <strong>{provider.provider.label}</strong>
                    <span>{provider.current.summary}</span>
                  </div>
                  <div className={styles.dailyList}>
                    {provider.daily.slice(0, 4).map((entry) => (
                      <div key={`${provider.provider.provider}-${entry.forecastForDate}`} className={styles.forecastRow}>
                        <div className={styles.forecastHeader}>
                          <strong>{entry.forecastForDate}</strong>
                          <span>{formatValue(entry.predictedTemp, "C")}</span>
                        </div>
                        <p className={styles.subtle}>
                          Rain {formatValue(entry.predictedRain, " mm")} • Wind {formatValue(entry.predictedWind, " km/h")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Trust meter</h2>
            <TrustRow accuracy={favorite.accuracy} />
          </section>
        </div>
      </div>
    </main>
  );
}

export function WeatherSettingsView({
  children
}: {
  children?: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Settings</span>
          <h1>Android-friendly controls for units, providers, and offline behavior.</h1>
          <p>The UI is ready for Capacitor wrapping: keep settings touch-sized, cache-friendly, and easy to sync with device storage later.</p>
        </section>

        <section className={`${styles.card} ${styles.fullWidth}`}>
          <div className={styles.settingsList}>
            <div className={styles.settingRow}>
              <strong>Units</strong>
              <p className={styles.subtle}>Start with Celsius and millimeters, then toggle to Fahrenheit later with a small client-side preference store.</p>
            </div>
            <div className={styles.settingRow}>
              <strong>Provider preference</strong>
              <p className={styles.subtle}>Keep both feeds visible, but allow a preferred default card order if one source earns more trust for a location.</p>
            </div>
            <div className={styles.settingRow}>
              <strong>Offline caching</strong>
              <p className={styles.subtle}>Persist the latest favorite snapshots so opening the app on weak mobile data still feels instant.</p>
            </div>
            <div className={styles.settingRow}>
              <strong>Capacitor target</strong>
              <p className={styles.subtle}>This route structure is ready to wrap with Capacitor once native config and Android icons are added.</p>
            </div>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}
