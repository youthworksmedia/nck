"use client";

import { useEffect } from "react";

export function DashboardSeenMarker() {
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/dashboard-state/seen", {
      method: "POST",
      signal: controller.signal
    }).catch(() => {
      // Non-critical state update; the onboarding screen can safely show again.
    });

    return () => controller.abort();
  }, []);

  return null;
}
