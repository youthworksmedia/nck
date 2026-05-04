"use client";

import { useEffect, useState } from "react";

import styles from "@/components/weather-shell.module.css";
import { readPreference, writePreference } from "@/lib/capacitor";
import { DEFAULT_WEATHER_SETTINGS } from "@/lib/weather";
import type { WeatherSettings } from "@/types/weather";

const settingsStorageKey = "weather-settings-v1";

function readSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_WEATHER_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(settingsStorageKey);
    return raw
      ? ({ ...DEFAULT_WEATHER_SETTINGS, ...JSON.parse(raw) } as WeatherSettings)
      : DEFAULT_WEATHER_SETTINGS;
  } catch {
    return DEFAULT_WEATHER_SETTINGS;
  }
}

export function WeatherSettingsClient() {
  const [settings, setSettings] = useState<WeatherSettings>(DEFAULT_WEATHER_SETTINGS);
  const [message, setMessage] = useState("Preferences are saved on this device.");

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const raw = await readPreference(settingsStorageKey);
      const nextSettings = raw
        ? ({ ...DEFAULT_WEATHER_SETTINGS, ...JSON.parse(raw) } as WeatherSettings)
        : readSettings();

      if (isMounted) {
        setSettings(nextSettings);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void writePreference(settingsStorageKey, JSON.stringify(settings));
  }, [settings]);

  return (
    <section className={`${styles.card} ${styles.fullWidth}`}>
      <div className={styles.settingsList}>
        <label className={styles.settingRow}>
          <strong>Units</strong>
          <select
            className={styles.surfaceSelect}
            value={settings.units}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                units: event.target.value as WeatherSettings["units"]
              }))
            }
          >
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </label>

        <label className={styles.settingRow}>
          <strong>Preferred provider order</strong>
          <select
            className={styles.surfaceSelect}
            value={settings.preferredProvider}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                preferredProvider: event.target.value as WeatherSettings["preferredProvider"]
              }))
            }
          >
            <option value="auto">Auto</option>
            <option value="YR">YR.no first</option>
            <option value="BOM">BOM first</option>
          </select>
        </label>

        <div className={styles.settingRow}>
          <strong>Offline caching</strong>
          <div className={styles.inlineActions}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={() => {
                setSettings((current) => ({
                  ...current,
                  offlineCaching: !current.offlineCaching
                }));
                setMessage("Preference saved for this device.");
              }}
            >
              {settings.offlineCaching ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        <div className={styles.settingRow}>
          <strong>Forecast logging</strong>
          <p className={styles.subtle}>Favorites are logged on the server schedule. Non-favorites stay live-only and are never added to history.</p>
        </div>

        <p className={styles.subtle}>{message}</p>
      </div>
    </section>
  );
}
