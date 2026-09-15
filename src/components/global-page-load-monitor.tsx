"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { PageLoadingScreen } from "@/components/page-loading-screen";

type PendingNavigation = {
  fromPath: string;
  startedAt: number;
  targetPath: string;
};

type SessionAccess = {
  isSignedIn: boolean;
  isSuperAdmin: boolean;
};

function getCurrentPath(pathname: string, searchParams: URLSearchParams | ReturnType<typeof useSearchParams>) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function isInternalNavigation(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download") || anchor.getAttribute("rel")?.includes("external")) {
    return false;
  }

  return true;
}

function postPerformanceLog(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/performance", blob);
    return;
  }

  void fetch("/api/performance", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body,
    keepalive: true
  });
}

export function GlobalPageLoadMonitor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = useMemo(() => getCurrentPath(pathname, searchParams), [pathname, searchParams]);
  const [sessionAccess, setSessionAccess] = useState<SessionAccess>({ isSignedIn: false, isSuperAdmin: false });
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pendingNavigationRef = useRef<PendingNavigation | null>(null);
  const initialLogSentRef = useRef(false);

  useEffect(() => {
    void fetch("/api/performance/session", {
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SessionAccess;
        setSessionAccess({
          isSignedIn: Boolean(data.isSignedIn),
          isSuperAdmin: Boolean(data.isSuperAdmin)
        });
      })
      .catch(() => {
        setSessionAccess({ isSignedIn: false, isSuperAdmin: false });
      });
  }, []);

  useEffect(() => {
    if (initialLogSentRef.current) {
      return;
    }

    initialLogSentRef.current = true;

    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    if (!navigationEntry) {
      return;
    }

    postPerformanceLog({
      durationMs: navigationEntry.duration,
      eventType: "initial_load",
      finalPath: currentPath,
      sourcePath: null,
      targetPath: currentPath,
      ttfbMs: navigationEntry.responseStart,
      domCompleteMs: navigationEntry.domComplete,
      windowLoadedMs: navigationEntry.loadEventEnd,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
  }, [currentPath]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a") : null;

      if (!(target instanceof HTMLAnchorElement) || !isInternalNavigation(target)) {
        return;
      }

      const url = new URL(target.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      const targetPath = `${url.pathname}${url.search}`;

      if (targetPath === currentPath) {
        return;
      }

      const nextPending = {
        fromPath: currentPath,
        targetPath,
        startedAt: performance.now()
      };

      pendingNavigationRef.current = nextPending;
      setPendingNavigation(nextPending);
      setElapsedMs(0);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [currentPath]);

  useEffect(() => {
    if (!pendingNavigation) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedMs(performance.now() - pendingNavigation.startedAt);
    }, 100);

    return () => window.clearInterval(interval);
  }, [pendingNavigation]);

  useEffect(() => {
    const pending = pendingNavigationRef.current;

    if (!pending || currentPath === pending.fromPath) {
      return;
    }

    const durationMs = performance.now() - pending.startedAt;

    postPerformanceLog({
      durationMs,
      eventType: "client_navigation",
      finalPath: currentPath,
      sourcePath: pending.fromPath,
      targetPath: pending.targetPath,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });

    pendingNavigationRef.current = null;
    setPendingNavigation(null);
    setElapsedMs(0);
  }, [currentPath]);

  if (!pendingNavigation) {
    return null;
  }

  return (
    <div className="global-page-load-overlay">
      <PageLoadingScreen
        secondsLabel={sessionAccess.isSuperAdmin ? `${(elapsedMs / 1000).toFixed(1)}s elapsed` : null}
      />
    </div>
  );
}
