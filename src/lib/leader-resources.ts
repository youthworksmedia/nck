import { cache } from "react";
import { unstable_cache } from "next/cache";

import { leaderGamesSectionId } from "@/lib/games-library";
import { leaderPhotosSectionId } from "@/lib/photo-library";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LeaderResourceItem, LeaderResourceSection } from "@/types";

type LeaderResourceType = LeaderResourceItem["resourceType"];

const leaderResourceTypes: LeaderResourceType[] = ["video", "pdf", "guide", "tool", "link", "coming_soon"];

export const leaderResourceTypeOptions = leaderResourceTypes;
const hiddenLeaderResourceSectionIds = new Set([leaderGamesSectionId, leaderPhotosSectionId]);

export function normalizeLeaderResourceType(value?: string | null): LeaderResourceType {
  return leaderResourceTypes.includes(value as LeaderResourceType) ? (value as LeaderResourceType) : "video";
}

export const demoLeaderResources: LeaderResourceSection[] = [
  {
    id: "video-training",
    title: "Video Training",
    description: "",
    displayOrder: 1,
    status: "open",
    items: [
      {
        id: "adapting-the-curriculum",
        sectionId: "video-training",
        title: "Adapting the curriculum",
        description: "How to flex the lessons for your group's age range, attention span, and church context.",
        eyebrow: "Video",
        duration: "12 min",
        resourceType: "video",
        url: null,
        filePath: null,
        fileName: null,
        displayOrder: 1,
        status: "open"
      },
      {
        id: "more-videos-coming",
        sectionId: "video-training",
        title: "More videos coming",
        description: "New training content added each term.",
        eyebrow: "",
        resourceType: "coming_soon",
        url: null,
        filePath: null,
        fileName: null,
        displayOrder: 2,
        status: "open"
      }
    ]
  },
  {
    id: "tools",
    title: "Tools",
    description: "",
    displayOrder: 2,
    status: "open",
    items: [
      {
        id: "games-library",
        sectionId: "tools",
        title: "Games Library",
        description: "Recommended games by age group, with full instructions.",
        eyebrow: "Tool",
        duration: "",
        resourceType: "tool",
        url: "/leaders/games",
        filePath: null,
        fileName: null,
        displayOrder: 1,
        status: "open"
      },
      {
        id: "image-library",
        sectionId: "tools",
        title: "Image Library",
        description: "Photos of Bible places for teaching and downloads.",
        eyebrow: "Tool",
        duration: "",
        resourceType: "tool",
        url: "/leaders/photos",
        filePath: null,
        fileName: null,
        displayOrder: 2,
        status: "open"
      }
    ]
  }
];

const imageLibraryToolItem: LeaderResourceItem = {
  id: "image-library",
  sectionId: "tools",
  title: "Image Library",
  description: "Photos of Bible places for teaching and downloads.",
  eyebrow: "Tool",
  duration: "",
  resourceType: "tool",
  url: "/leaders/photos",
  filePath: null,
  fileName: null,
  displayOrder: 0,
  status: "open"
};

function mapItem(row: Record<string, unknown>): LeaderResourceItem {
  return {
    id: String(row.id),
    sectionId: String(row.section_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    eyebrow: String(row.eyebrow ?? ""),
    duration: typeof row.duration === "string" ? row.duration : null,
    resourceType: normalizeLeaderResourceType(String(row.resource_type ?? "")),
    url: typeof row.url === "string" ? row.url : null,
    filePath: typeof row.file_path === "string" ? row.file_path : null,
    fileName: typeof row.file_name === "string" ? row.file_name : null,
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

export const getAdminLeaderResources = cache(async function getAdminLeaderResources(): Promise<LeaderResourceSection[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return demoLeaderResources;
  }

  const [{ data: sections }, { data: items }] = await Promise.all([
    adminSupabase
      .from("leader_resource_sections")
      .select("*")
      .order("display_order", { ascending: true }),
    adminSupabase
      .from("leader_resource_items")
      .select("*")
      .order("display_order", { ascending: true })
  ]);

  if (!sections?.length) {
    return [];
  }

  const itemsBySection = new Map<string, LeaderResourceItem[]>();
  (items ?? []).forEach((item) => {
    const mapped = mapItem(item as Record<string, unknown>);
    if (hiddenLeaderResourceSectionIds.has(mapped.sectionId)) {
      return;
    }

    itemsBySection.set(mapped.sectionId, [...(itemsBySection.get(mapped.sectionId) ?? []), mapped]);
  });

  return sections
    .filter((section) => !hiddenLeaderResourceSectionIds.has(section.id))
    .map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description ?? "",
      displayOrder: section.display_order ?? 0,
      status: section.published === false ? "closed" : "open",
      items:
        section.title.trim().toLowerCase() === "tools" &&
        !(itemsBySection.get(section.id) ?? []).some((item) => item.url === "/leaders/photos")
          ? [imageLibraryToolItem, ...(itemsBySection.get(section.id) ?? [])]
          : itemsBySection.get(section.id) ?? []
    }));
});

export async function getPublishedLeaderResources() {
  return getCachedPublishedLeaderResources();
}

const getCachedPublishedLeaderResources = unstable_cache(
  async function getCachedPublishedLeaderResources() {
    const sections = await getAdminLeaderResources();

    return sections
      .filter((section) => section.status === "open")
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.status === "open")
      }))
      .filter((section) => section.items.length);
  },
  ["published-leader-resources"],
  {
    revalidate: 300,
    tags: ["leader-resources"]
  }
);
