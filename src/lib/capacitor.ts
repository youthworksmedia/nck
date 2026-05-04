import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Preferences } from "@capacitor/preferences";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function readPreference(key: string) {
  if (isNativeApp()) {
    const { value } = await Preferences.get({ key });
    return value;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

export async function writePreference(key: string, value: string) {
  if (isNativeApp()) {
    await Preferences.set({ key, value });
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

export async function removePreference(key: string) {
  if (isNativeApp()) {
    await Preferences.remove({ key });
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

export async function getDevicePosition() {
  if (isNativeApp()) {
    const permission = await Geolocation.requestPermissions();

    if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
      throw new Error("Location permission was not granted.");
    }

    return Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    });
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not available in this environment.");
  }

  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    });
  });
}
