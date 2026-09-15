"use client";

import { useEffect } from "react";

type ResourceVisitTrackerProps = {
  resourceId: string;
};

export function ResourceVisitTracker({ resourceId }: ResourceVisitTrackerProps) {
  useEffect(() => {
    fetch("/api/dashboard-state/resource", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ resourceId }),
      keepalive: true
    }).catch(() => {
      // Dashboard history is a convenience signal; browsing should never fail because it cannot be saved.
    });
  }, [resourceId]);

  return null;
}
