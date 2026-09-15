import { cache } from "react";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRequestSupabaseAuth } from "@/lib/supabase/auth";
import { withTiming } from "@/lib/timing";

export type PerformanceLogPayload = {
  durationMs: number;
  eventType: "initial_load" | "client_navigation";
  finalPath: string;
  sourcePath?: string | null;
  targetPath?: string | null;
  ttfbMs?: number | null;
  domCompleteMs?: number | null;
  windowLoadedMs?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
};

export type PerformanceLogRow = {
  id: string;
  createdAt: string;
  durationMs: number;
  eventType: string;
  finalPath: string;
  sourcePath: string | null;
  targetPath: string | null;
  userEmail: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
};

export type PerformanceRouteSummary = {
  averageDurationMs: number;
  finalPath: string;
  latestAt: string;
  maxDurationMs: number;
  samples: number;
};

function normalizePath(value?: string | null) {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/")) {
    return `/${value.slice(0, 255)}`;
  }

  return value.slice(0, 255);
}

function normalizeMs(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

export async function insertPerformanceLog(payload: PerformanceLogPayload) {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return { ok: false as const, reason: "missing_admin_client" };
  }

  const { user } = await getRequestSupabaseAuth();
  const insertPayload = {
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    event_type: payload.eventType,
    source_path: normalizePath(payload.sourcePath),
    target_path: normalizePath(payload.targetPath),
    final_path: normalizePath(payload.finalPath),
    duration_ms: normalizeMs(payload.durationMs),
    ttfb_ms: normalizeMs(payload.ttfbMs),
    dom_complete_ms: normalizeMs(payload.domCompleteMs),
    window_loaded_ms: normalizeMs(payload.windowLoadedMs),
    viewport_width: payload.viewportWidth ?? null,
    viewport_height: payload.viewportHeight ?? null
  };

  const { error } = await withTiming("db.query", "performance_logs.insert", async () =>
    adminSupabase.from("page_performance_logs").insert(insertPayload)
  );

  if (error) {
    if (error.message.includes("page_performance_logs")) {
      return { ok: false as const, reason: "missing_table" };
    }

    throw error;
  }

  return { ok: true as const };
}

export const getAdminPerformanceLogs = cache(async function getAdminPerformanceLogs(limit = 100) {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return [] as PerformanceLogRow[];
  }

  const { data, error } = await withTiming("db.query", "performance_logs.recent", async () =>
    adminSupabase
      .from("page_performance_logs")
      .select("id, created_at, duration_ms, event_type, final_path, source_path, target_path, user_email, viewport_width, viewport_height")
      .order("created_at", { ascending: false })
      .limit(limit)
  );

  if (error) {
    if (error.message.includes("page_performance_logs")) {
      return [] as PerformanceLogRow[];
    }

    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    durationMs: row.duration_ms ?? 0,
    eventType: row.event_type ?? "client_navigation",
    finalPath: row.final_path ?? "/",
    sourcePath: row.source_path ?? null,
    targetPath: row.target_path ?? null,
    userEmail: row.user_email ?? null,
    viewportWidth: row.viewport_width ?? null,
    viewportHeight: row.viewport_height ?? null
  }));
});

export const getAdminPerformanceRouteSummaries = cache(async function getAdminPerformanceRouteSummaries(limit = 250) {
  const rows = await getAdminPerformanceLogs(limit);
  const summaryMap = new Map<string, PerformanceRouteSummary>();

  for (const row of rows) {
    const current = summaryMap.get(row.finalPath);

    if (!current) {
      summaryMap.set(row.finalPath, {
        finalPath: row.finalPath,
        samples: 1,
        averageDurationMs: row.durationMs,
        maxDurationMs: row.durationMs,
        latestAt: row.createdAt
      });
      continue;
    }

    const nextSamples = current.samples + 1;
    summaryMap.set(row.finalPath, {
      finalPath: row.finalPath,
      samples: nextSamples,
      averageDurationMs: (current.averageDurationMs * current.samples + row.durationMs) / nextSamples,
      maxDurationMs: Math.max(current.maxDurationMs, row.durationMs),
      latestAt: current.latestAt > row.createdAt ? current.latestAt : row.createdAt
    });
  }

  return Array.from(summaryMap.values()).sort((left, right) => right.averageDurationMs - left.averageDurationMs);
});

export async function getPerformanceSessionAccess() {
  const [{ user }, isSuperAdmin] = await Promise.all([
    getRequestSupabaseAuth(),
    isCurrentUserSuperAdmin()
  ]);

  return {
    isSuperAdmin,
    isSignedIn: Boolean(user)
  };
}
