import { cache } from "react";
import { unstable_cache } from "next/cache";

import {
  curriculumSections,
  curriculumYears,
  getCurriculumSectionMeta,
  normalizeCurriculumSection,
  normalizeCurriculumYear,
  type CurriculumSection,
  type CurriculumYear
} from "@/lib/curriculum";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getResourceIconKey } from "@/lib/resource-icon-paths";
import { getUnitGraphicExtensionLabel } from "@/lib/unit-graphic-metadata";
import type { CurriculumUnitGraphic, CurriculumUnitOverview } from "@/types";

export const unitHeroGraphicTitle = "__unit_hero_background__";

const unitCopy: Record<CurriculumYear, Record<CurriculumSection, { focus: string; overview: string; intro: string; deepDive: string }>> = {
  "Volume 1": {
    "Unit 1": {
      focus: "Luke - Set Free",
      overview: "Kids meet Jesus in Luke as the one who brings freedom, welcome, healing, and hope. Each lesson helps leaders show how Jesus sets people free to trust him and live with joy.",
      intro: "How Luke introduces Jesus as the rescuer who welcomes outsiders.",
      deepDive: "Teaching freedom, healing, and discipleship across the quarter."
    },
    "Unit 2": {
      focus: "Acts",
      overview: "Kids follow the first Christians as the good news spreads by the power of the Holy Spirit. This quarter helps children see that Jesus keeps building his church through ordinary people.",
      intro: "Why Acts matters for children learning courage and mission.",
      deepDive: "How to connect Pentecost, witness, and church life lesson by lesson."
    },
    "Unit 3": {
      focus: "Genesis - In the beginning",
      overview: "Kids begin with creation, promise, family, failure, and faith. The unit traces how God starts his rescue story and remains faithful even when people make a mess of things.",
      intro: "How Genesis frames God as creator, promise-maker, and rescuer.",
      deepDive: "Helping children hold together creation, sin, promise, and blessing."
    },
    "Unit 4": {
      focus: "Exodus - The second best rescue",
      overview: "Kids explore how God rescues his people from slavery and teaches them to live as his treasured people. The unit points forward to Jesus, the better rescue.",
      intro: "Why Exodus gives children a vivid picture of rescue and worship.",
      deepDive: "Teaching plagues, Passover, wilderness, and covenant with care."
    },
    Holiday: {
      focus: "Identity",
      overview: "Kids reflect on who God says they are and how belonging to him shapes everyday life. This shorter unit is ideal for holiday rhythms and mixed-age groups.",
      intro: "A simple pathway for teaching identity during summer programs.",
      deepDive: "Keeping holiday lessons clear, pastoral, and easy to lead."
    },
    Advent: {
      focus: "Waiting for the King",
      overview: "Kids prepare for Christmas by tracing God's promises and seeing how Jesus comes as the long-awaited King. This shorter unit helps leaders teach Advent with hope, joy, and clarity.",
      intro: "How Advent helps children wait with hope and recognise Jesus as God's promised rescuer.",
      deepDive: "Teaching promise, fulfilment, and Christmas hope across a short seasonal unit."
    }
  }
};

function defaultOverview(yearCycle: CurriculumYear, term: CurriculumSection): CurriculumUnitOverview {
  const meta = getCurriculumSectionMeta(yearCycle, term);
  const copy = unitCopy[yearCycle][term];

  return {
    id: `${yearCycle}-${term}`,
    yearCycle,
    term,
    eyebrow: `Teach · ${yearCycle}`,
    title: term,
    subtitle: copy.focus || meta.title,
    heroImagePath: null,
    heroImageName: null,
    overviewHtml: `<h2>About this unit</h2><p>${copy.overview}</p><p>Before teaching, we recommend leaders review the unit files and videos so the team can introduce this ${term.toLowerCase()} with confidence.</p>`,
    introVideoTitle: "Unit Introduction",
    introVideoMeta: "Video · 8 min",
    introVideoDescription: copy.intro,
    introVideoUrl: null,
    deepDiveVideoTitle: "Teaching Deep Dive",
    deepDiveVideoMeta: "Video · 14 min",
    deepDiveVideoDescription: copy.deepDive,
    deepDiveVideoUrl: null,
    status: "open",
    graphics: []
  };
}

function mapGraphic(row: Record<string, unknown>): CurriculumUnitGraphic {
  const fileName = typeof row.file_name === "string" ? row.file_name : null;

  return {
    id: String(row.id),
    yearCycle: normalizeCurriculumYear(String(row.year_cycle ?? "")),
    term: normalizeCurriculumSection(String(row.term ?? "")),
    title: String(row.title ?? ""),
    description: fileName ? getUnitGraphicExtensionLabel(fileName) : String(row.description ?? ""),
    icon: getResourceIconKey(String(row.title ?? ""), fileName, String(row.icon ?? "")) ?? "unit-logo",
    filePath: typeof row.file_path === "string" ? row.file_path : null,
    fileName,
    includeCopyright: row.include_copyright === true,
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

function normalizeOverviewText(value: string, yearCycle: CurriculumYear, term: CurriculumSection) {
  return value
    .replaceAll("Year 1", yearCycle)
    .replaceAll("Year 2", yearCycle)
    .replaceAll("Year 3", yearCycle)
    .replaceAll("Quarter 1", "Unit 1")
    .replaceAll("Quarter 2", "Unit 2")
    .replaceAll("Quarter 3", "Unit 3")
    .replaceAll("Quarter 4", "Unit 4")
    .replaceAll("Summer", "Holiday")
    .replaceAll("quarter", "unit");
}

function mapOverview(row: Record<string, unknown>, graphics: CurriculumUnitGraphic[]): CurriculumUnitOverview {
  const yearCycle = normalizeCurriculumYear(String(row.year_cycle ?? ""));
  const term = normalizeCurriculumSection(String(row.term ?? ""));
  const fallback = defaultOverview(yearCycle, term);
  const heroGraphic = graphics.find((graphic) => graphic.title === unitHeroGraphicTitle);
  const visibleGraphics = graphics.filter((graphic) => graphic.title !== unitHeroGraphicTitle);
  const text = (value: unknown, defaultValue: string) =>
    typeof value === "string" && value.trim()
      ? normalizeOverviewText(value, yearCycle, term)
      : defaultValue;

  return {
    ...fallback,
    id: String(row.id),
    eyebrow: text(row.eyebrow, fallback.eyebrow),
    title: term,
    subtitle: text(row.subtitle, fallback.subtitle),
    heroImagePath: heroGraphic?.filePath ?? null,
    heroImageName: heroGraphic?.fileName ?? null,
    overviewHtml: text(row.overview_html, fallback.overviewHtml),
    introVideoTitle: text(row.intro_video_title, fallback.introVideoTitle),
    introVideoMeta: text(row.intro_video_meta, fallback.introVideoMeta),
    introVideoDescription: text(row.intro_video_description, fallback.introVideoDescription),
    introVideoUrl: typeof row.intro_video_url === "string" && row.intro_video_url.trim() ? row.intro_video_url : null,
    deepDiveVideoTitle: text(row.deep_dive_video_title, fallback.deepDiveVideoTitle),
    deepDiveVideoMeta: text(row.deep_dive_video_meta, fallback.deepDiveVideoMeta),
    deepDiveVideoDescription: text(row.deep_dive_video_description, fallback.deepDiveVideoDescription),
    deepDiveVideoUrl: typeof row.deep_dive_video_url === "string" && row.deep_dive_video_url.trim() ? row.deep_dive_video_url : null,
    status: row.published === false ? "closed" : "open",
    graphics: visibleGraphics
  };
}

export const getAdminUnitOverviews = cache(async function getAdminUnitOverviews(): Promise<CurriculumUnitOverview[]> {
  const adminSupabase = createSupabaseAdminClient();
  const fallbacks = curriculumYears.flatMap((year) => curriculumSections.map((term) => defaultOverview(year, term)));

  if (!adminSupabase) {
    return fallbacks;
  }

  const [{ data: overviews, error: overviewError }, { data: graphics }] = await Promise.all([
    adminSupabase
      .from("curriculum_unit_overviews")
      .select("*")
      .in("year_cycle", ["Volume 1", "Year 1", "Year A"]),
    adminSupabase
      .from("curriculum_unit_graphics")
      .select("*")
      .in("year_cycle", ["Volume 1", "Year 1", "Year A"])
      .order("display_order", { ascending: true })
  ]);

  if (overviewError) {
    return fallbacks;
  }

  const graphicsByKey = new Map<string, CurriculumUnitGraphic[]>();

  (graphics ?? []).map((row) => mapGraphic(row as Record<string, unknown>)).forEach((graphic) => {
    const key = `${graphic.yearCycle}::${graphic.term}`;
    graphicsByKey.set(key, [...(graphicsByKey.get(key) ?? []), graphic]);
  });

  const overviewMap = new Map(
    (overviews ?? []).map((row) => {
      const yearCycle = normalizeCurriculumYear(String(row.year_cycle ?? ""));
      const term = normalizeCurriculumSection(String(row.term ?? ""));
      const key = `${yearCycle}::${term}`;

      return [key, mapOverview(row as Record<string, unknown>, graphicsByKey.get(key) ?? [])];
    })
  );

  return fallbacks.map((fallback) => {
    const key = `${fallback.yearCycle}::${fallback.term}`;
    const overview = overviewMap.get(key);
    const graphics = graphicsByKey.get(key) ?? overview?.graphics ?? fallback.graphics;
    const heroGraphic = graphics.find((graphic) => graphic.title === unitHeroGraphicTitle);

    return {
      ...(overview ?? fallback),
      heroImagePath: overview?.heroImagePath ?? heroGraphic?.filePath ?? null,
      heroImageName: overview?.heroImageName ?? heroGraphic?.fileName ?? null,
      graphics: graphics.filter((graphic) => graphic.title !== unitHeroGraphicTitle)
    };
  });
});

export async function getPublishedUnitOverviews() {
  return getCachedPublishedUnitOverviews();
}

const getCachedPublishedUnitOverviews = unstable_cache(
  async function getCachedPublishedUnitOverviews() {
    const overviews = await getAdminUnitOverviews();

    return overviews
      .map((overview) => ({
        ...overview,
        graphics: overview.graphics.filter((graphic) => graphic.status === "open")
      }))
      .filter((overview) => overview.status === "open");
  },
  ["published-unit-overviews"],
  {
    revalidate: 300,
    tags: ["unit-overviews"]
  }
);
