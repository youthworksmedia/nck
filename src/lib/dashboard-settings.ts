import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type DashboardBibleVerse = {
  text: string;
  reference: string;
};

export type DashboardWelcomeSettings = {
  firstTimeHtml: string;
  returningHtml: string;
  returningHtmls: string[];
  introVideoTitle: string;
  introVideoUrl: string;
  bibleVerses: DashboardBibleVerse[];
};

export const defaultDashboardBibleVerses: DashboardBibleVerse[] = [
  {
    text: "Children are a heritage from the Lord, offspring a reward from him.",
    reference: "Psalm 127:3"
  }
];

export const defaultDashboardWelcomeSettings: DashboardWelcomeSettings = {
  firstTimeHtml: [
    "<h2>Welcome to New Creation Kids!</h2>",
    "<p>We're glad you're here. New Creation Kids exists for one purpose: to see children formed as disciples of Jesus. Not just taught a Bible story once a week, but discipled in a way that shapes their families, their leaders, and the church around them. Everything on this site works toward three goals: children growing as disciples, leaders equipped for the task of teaching them well, and families able to continue the conversation at home every week.</p>",
    "<h2>Where to go next</h2>",
    "<p><strong>Teach</strong> - weekly lesson content, activities, and leader's notes.</p>",
    "<p><strong>Leaders</strong> - training videos, tools and games library.</p>",
    "<p><strong>Family</strong> - take-home resources that help parents keep discipling their kids throughout the week.</p>",
    "<p>Watch the short video below to meet the team from New Creation Kids.</p>"
  ].join(""),
  returningHtml:
    "<h2>Welcome back!</h2><p>Everything you need for this week is one click away. Teach, Leaders, Family.</p>",
  returningHtmls: [
    "<h2>Welcome back!</h2><p>Everything you need for this week is one click away. Teach, Leaders, Family.</p>"
  ],
  introVideoTitle: "Introduction to New Creation Kids",
  introVideoUrl: "",
  bibleVerses: defaultDashboardBibleVerses
};

const allowedIframeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com"
]);

function normalizeUrl(raw: string) {
  try {
    const url = new URL(raw);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function isAllowedIframeUrl(raw: string) {
  const normalized = normalizeUrl(raw);

  if (!normalized) {
    return false;
  }

  const url = new URL(normalized);
  return Array.from(allowedIframeHosts).some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
}

export function sanitizeDashboardHtml(raw: string) {
  if (!raw.trim()) {
    return "";
  }

  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/<iframe\b([^>]*)>/gi, (match, attrs: string) => {
      const srcMatch = attrs.match(/\ssrc\s*=\s*(['"])(.*?)\1/i);

      if (!srcMatch || !isAllowedIframeUrl(srcMatch[2])) {
        return "";
      }

      const titleMatch = attrs.match(/\stitle\s*=\s*(['"])(.*?)\1/i);
      const src = normalizeUrl(srcMatch[2]);
      const title = titleMatch?.[2]?.replaceAll('"', "&quot;") || "Embedded video";

      return `<iframe src="${src}" title="${title}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen="true"></iframe>`;
    });
}

export function normalizeDashboardBibleVerses(value?: DashboardBibleVerse[] | null) {
  const verses = (value ?? [])
    .map((verse) => ({
      text: String(verse.text ?? "").trim(),
      reference: String(verse.reference ?? "").trim()
    }))
    .filter((verse) => verse.text && verse.reference);

  return verses.length ? verses : defaultDashboardBibleVerses;
}

export function normalizeReturningWelcomeMessages(value: Partial<DashboardWelcomeSettings>) {
  const messages = Array.isArray(value.returningHtmls)
    ? value.returningHtmls
    : value.returningHtml
      ? [value.returningHtml]
      : [];
  const normalizedMessages = messages
    .map((message) => sanitizeDashboardHtml(String(message ?? "")))
    .filter(Boolean);

  return normalizedMessages.length
    ? normalizedMessages
    : defaultDashboardWelcomeSettings.returningHtmls;
}

export function getRotatingReturningWelcomeHtml(settings: DashboardWelcomeSettings) {
  const messages = settings.returningHtmls.length
    ? settings.returningHtmls
    : [settings.returningHtml || defaultDashboardWelcomeSettings.returningHtml];
  const now = new Date();
  const dayIndex = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000
  );

  return messages[dayIndex % messages.length] ?? defaultDashboardWelcomeSettings.returningHtml;
}

export function normalizeDashboardSettings(value: Partial<DashboardWelcomeSettings>) {
  const returningHtmls = normalizeReturningWelcomeMessages(value);

  return {
    firstTimeHtml:
      sanitizeDashboardHtml(value.firstTimeHtml ?? "") ||
      defaultDashboardWelcomeSettings.firstTimeHtml,
    returningHtml: returningHtmls[0] ?? defaultDashboardWelcomeSettings.returningHtml,
    returningHtmls,
    introVideoTitle:
      String(value.introVideoTitle ?? "").trim() ||
      defaultDashboardWelcomeSettings.introVideoTitle,
    introVideoUrl: normalizeUrl(String(value.introVideoUrl ?? "")),
    bibleVerses: normalizeDashboardBibleVerses(value.bibleVerses)
  } satisfies DashboardWelcomeSettings;
}

async function getDashboardWelcomeSettingsFromDatabase(): Promise<DashboardWelcomeSettings> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return defaultDashboardWelcomeSettings;
  }

  const { data, error } = await adminSupabase
    .from("curriculum_settings")
    .select("value")
    .eq("key", "dashboard_welcome_settings")
    .limit(1)
    .maybeSingle();

  if (error || !data?.value) {
    return defaultDashboardWelcomeSettings;
  }

  try {
    return normalizeDashboardSettings(JSON.parse(data.value));
  } catch {
    return defaultDashboardWelcomeSettings;
  }
}

export const getDashboardWelcomeSettings = unstable_cache(
  getDashboardWelcomeSettingsFromDatabase,
  ["dashboard-welcome-settings"],
  {
    revalidate: 300,
    tags: ["dashboard-welcome-settings"]
  }
);
