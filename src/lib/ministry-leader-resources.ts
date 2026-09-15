import { cache } from "react";
import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  MinistryLeaderResourceItem,
  MinistryLeaderResourceSection
} from "@/types";

type ResourceType = MinistryLeaderResourceItem["resourceType"];

const resourceTypes: ResourceType[] = ["pdf", "xlsx", "zip", "video", "link", "coming_soon"];

export const ministryLeaderResourceTypeOptions = resourceTypes;

export function normalizeMinistryLeaderResourceType(value?: string | null): ResourceType {
  return resourceTypes.includes(value as ResourceType) ? (value as ResourceType) : "pdf";
}

export const demoMinistryLeaderResources: MinistryLeaderResourceSection[] = [
  {
    id: "planning",
    title: "Planning",
    description: "Tools to map your ministry year",
    displayOrder: 1,
    status: "open",
    items: [
      {
        id: "annual-planner-2027",
        sectionId: "planning",
        title: "Annual Planner 2027",
        description: "Map all 4 terms onto your church calendar",
        icon: "calendar",
        resourceType: "pdf",
        actionLabel: "PDF",
        displayOrder: 1,
        status: "open"
      },
      {
        id: "ministry-budget-template",
        sectionId: "planning",
        title: "Ministry Budget Template",
        description: "Plan curriculum, events and supplies",
        icon: "spreadsheet",
        resourceType: "xlsx",
        actionLabel: "XLSX",
        displayOrder: 2,
        status: "open"
      }
    ]
  },
  {
    id: "promotion",
    title: "Promotion",
    description: "Videos and assets to share the curriculum with your church",
    displayOrder: 2,
    status: "open",
    items: [
      {
        id: "30-second-promo-video",
        sectionId: "promotion",
        title: "30-second Promo Video",
        description: "For Sunday service screens · 1920×1080 MP4",
        icon: "play",
        resourceType: "video",
        actionLabel: "Watch",
        duration: "0:30",
        displayOrder: 1,
        status: "open"
      },
      {
        id: "90-second-vision-video",
        sectionId: "promotion",
        title: "90-second Vision Video",
        description: "For parent meetings · with subtitles",
        icon: "play",
        resourceType: "video",
        actionLabel: "Watch",
        duration: "1:30",
        displayOrder: 2,
        status: "open"
      },
      {
        id: "social-media-pack",
        sectionId: "promotion",
        title: "Social Media Pack",
        description: "Instagram squares, story templates, posters",
        icon: "palette",
        resourceType: "zip",
        actionLabel: "ZIP",
        displayOrder: 3,
        status: "open"
      }
    ]
  },
  {
    id: "coming-soon",
    title: "Coming soon",
    description: "More leader resources in development",
    displayOrder: 3,
    status: "open",
    items: [
      {
        id: "volunteer-recruitment-pack",
        sectionId: "coming-soon",
        title: "Volunteer Recruitment Pack",
        description: "In development",
        icon: "people",
        resourceType: "coming_soon",
        actionLabel: "Coming soon",
        displayOrder: 1,
        status: "open"
      }
    ]
  }
];

function mapItem(row: Record<string, unknown>): MinistryLeaderResourceItem {
  return {
    id: String(row.id),
    sectionId: String(row.section_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? "file"),
    resourceType: normalizeMinistryLeaderResourceType(String(row.resource_type ?? "")),
    actionLabel: String(row.action_label ?? ""),
    filePath: typeof row.file_path === "string" ? row.file_path : null,
    fileName: typeof row.file_name === "string" ? row.file_name : null,
    url: typeof row.url === "string" ? row.url : null,
    duration: typeof row.duration === "string" ? row.duration : null,
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

export const getAdminMinistryLeaderResources = cache(async function getAdminMinistryLeaderResources() {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return demoMinistryLeaderResources;
  }

  const [{ data: sections }, { data: items }] = await Promise.all([
    adminSupabase
      .from("ministry_leader_resource_sections")
      .select("*")
      .order("display_order", { ascending: true }),
    adminSupabase
      .from("ministry_leader_resource_items")
      .select("*")
      .order("display_order", { ascending: true })
  ]);

  if (!sections?.length) {
    return [];
  }

  const itemsBySection = new Map<string, MinistryLeaderResourceItem[]>();
  (items ?? []).forEach((item) => {
    const mapped = mapItem(item as Record<string, unknown>);
    itemsBySection.set(mapped.sectionId, [...(itemsBySection.get(mapped.sectionId) ?? []), mapped]);
  });

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description ?? "",
    displayOrder: section.display_order ?? 0,
    status: section.published === false ? "closed" : "open",
    items: itemsBySection.get(section.id) ?? []
  })) satisfies MinistryLeaderResourceSection[];
});

export async function getPublishedMinistryLeaderResources() {
  return getCachedPublishedMinistryLeaderResources();
}

const getCachedPublishedMinistryLeaderResources = unstable_cache(
  async function getCachedPublishedMinistryLeaderResources() {
    const sections = await getAdminMinistryLeaderResources();

    return sections
      .filter((section) => section.status === "open")
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.status === "open")
      }));
  },
  ["published-ministry-leader-resources"],
  {
    revalidate: 300,
    tags: ["ministry-leader-resources"]
  }
);
