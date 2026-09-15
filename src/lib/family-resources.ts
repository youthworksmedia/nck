import { cache } from "react";
import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FamilyResourceCard, FamilyResourceLesson, FamilyResourceTerm } from "@/types";

type StoredMemoryVerse = {
  text?: string | null;
  url?: string | null;
};

export const demoFamilyResourceCards: FamilyResourceCard[] = [
  {
    id: "family-discussion-guide",
    title: "Family Discussion Guide",
    description: "Conversation starters for families — connecting Sunday's lesson to life at home.",
    icon: "💬",
    badge: "Weekly PDF",
    meta: "per lesson",
    displayOrder: 1,
    status: "open"
  },
  {
    id: "activity-sheet",
    title: "Activity Sheet",
    description: "Printable colouring and activity pages tied to each week's lesson. Best for ages 3–7.",
    icon: "🎨",
    badge: "Ages 3–7",
    meta: "per lesson",
    displayOrder: 2,
    status: "open"
  },
  {
    id: "memory-verse-card",
    title: "Memory Verse Card",
    description: "A printable card with each term's memory verse — designed for kids to take home and keep.",
    icon: "📌",
    badge: "Per term",
    meta: "per term",
    displayOrder: 3,
    status: "open"
  }
];

export const demoFamilyResourceLessons: FamilyResourceLesson[] = [
  {
    id: "term-1-lesson-1",
    term: 1,
    lessonNumber: 1,
    title: "Jesus' final instructions",
    scripture: "Acts 1:1–11",
    displayOrder: 1,
    status: "open"
  },
  {
    id: "term-1-lesson-2",
    term: 1,
    lessonNumber: 2,
    title: "The Spirit Comes",
    scripture: "Acts 2",
    displayOrder: 2,
    status: "open"
  },
  {
    id: "term-1-lesson-3",
    term: 1,
    lessonNumber: 3,
    title: "Healing and Preaching",
    scripture: "Acts 3–4:22",
    displayOrder: 3,
    status: "open"
  }
];

export const demoFamilyResourceTerms: FamilyResourceTerm[] = [
  {
    id: "term-1",
    term: 1,
    memoryText: '"Be strong and courageous." — Joshua 1:9',
    memoryUrl: null,
    readingGuideUrl: null,
    readingGuideCanvaUrl: null,
    parentDevotionUrl: null,
    parentDevotionCanvaUrl: null,
    status: "open"
  },
  {
    id: "term-2",
    term: 2,
    memoryText: "",
    memoryUrl: null,
    readingGuideUrl: null,
    readingGuideCanvaUrl: null,
    parentDevotionUrl: null,
    parentDevotionCanvaUrl: null,
    status: "open"
  },
  {
    id: "term-3",
    term: 3,
    memoryText: "",
    memoryUrl: null,
    readingGuideUrl: null,
    readingGuideCanvaUrl: null,
    parentDevotionUrl: null,
    parentDevotionCanvaUrl: null,
    status: "open"
  },
  {
    id: "term-4",
    term: 4,
    memoryText: "",
    memoryUrl: null,
    readingGuideUrl: null,
    readingGuideCanvaUrl: null,
    parentDevotionUrl: null,
    parentDevotionCanvaUrl: null,
    status: "open"
  },
  {
    id: "term-5",
    term: 5,
    memoryText: "",
    memoryUrl: null,
    readingGuideUrl: null,
    readingGuideCanvaUrl: null,
    parentDevotionUrl: null,
    parentDevotionCanvaUrl: null,
    status: "open"
  },
  {
    id: "term-6",
    term: 6,
    memoryText: "",
    memoryUrl: null,
    readingGuideUrl: null,
    readingGuideCanvaUrl: null,
    parentDevotionUrl: null,
    parentDevotionCanvaUrl: null,
    status: "open"
  }
];

function mapCard(row: Record<string, unknown>): FamilyResourceCard {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? ""),
    badge: String(row.badge ?? ""),
    meta: String(row.meta ?? ""),
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

function mapLesson(row: Record<string, unknown>): FamilyResourceLesson {
  return {
    id: String(row.id),
    term: Number(row.term ?? 1),
    lessonNumber: Number(row.lesson_number ?? 1),
    title: String(row.title ?? ""),
    scripture: String(row.scripture ?? ""),
    discussionUrl: typeof row.discussion_url === "string" ? row.discussion_url : null,
    activityUrl: typeof row.activity_url === "string" ? row.activity_url : null,
    memoryUrl: typeof row.memory_url === "string" ? row.memory_url : null,
    memoryText: typeof row.memory_text === "string" ? row.memory_text : null,
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

function mapTerm(row: Record<string, unknown>): FamilyResourceTerm {
  const storedMemoryText = String(row.memory_text ?? "");
  let memoryVerses: StoredMemoryVerse[] = [];

  try {
    const parsed = JSON.parse(storedMemoryText) as unknown;
    if (parsed && typeof parsed === "object" && "items" in parsed && Array.isArray(parsed.items)) {
      memoryVerses = parsed.items as StoredMemoryVerse[];
    }
  } catch {
    memoryVerses = [];
  }

  const firstMemory = memoryVerses[0];
  const secondMemory = memoryVerses[1];

  return {
    id: String(row.id),
    term: Number(row.term ?? 1),
    memoryText: firstMemory ? String(firstMemory.text ?? "") : storedMemoryText,
    memoryUrl: firstMemory?.url ?? (typeof row.memory_url === "string" ? row.memory_url : null),
    memoryText2: secondMemory?.text ?? (typeof row.memory_text_2 === "string" ? row.memory_text_2 : null),
    memoryUrl2: secondMemory?.url ?? (typeof row.memory_url_2 === "string" ? row.memory_url_2 : null),
    readingGuideUrl: typeof row.reading_guide_url === "string" ? row.reading_guide_url : null,
    readingGuideCanvaUrl: typeof row.reading_guide_canva_url === "string" ? row.reading_guide_canva_url : null,
    parentDevotionUrl: typeof row.parent_devotion_url === "string" ? row.parent_devotion_url : null,
    parentDevotionCanvaUrl: typeof row.parent_devotion_canva_url === "string" ? row.parent_devotion_canva_url : null,
    status: row.published === false ? "closed" : "open"
  };
}

export const getAdminFamilyResources = cache(async function getAdminFamilyResources() {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      cards: demoFamilyResourceCards,
      lessons: demoFamilyResourceLessons,
      terms: demoFamilyResourceTerms
    };
  }

  const [{ data: cards }, { data: lessons }, { data: terms }] = await Promise.all([
    adminSupabase
      .from("family_resource_cards")
      .select("*")
      .order("display_order", { ascending: true }),
    adminSupabase
      .from("family_resource_lessons")
      .select("*")
      .order("term", { ascending: true })
      .order("display_order", { ascending: true }),
    adminSupabase
      .from("family_resource_terms")
      .select("*")
      .order("term", { ascending: true })
  ]);

  return {
    cards: (cards ?? []).map((card) => mapCard(card as Record<string, unknown>)),
    lessons: (lessons ?? []).map((lesson) => mapLesson(lesson as Record<string, unknown>)),
    terms: (terms ?? demoFamilyResourceTerms).map((term) => mapTerm(term as Record<string, unknown>))
  };
});

export async function getPublishedFamilyResources() {
  return getCachedPublishedFamilyResources();
}

const getCachedPublishedFamilyResources = unstable_cache(
  async function getCachedPublishedFamilyResources() {
    const resources = await getAdminFamilyResources();

    return {
      cards: resources.cards.filter((card) => card.status === "open"),
      lessons: resources.lessons.filter((lesson) => lesson.status === "open"),
      terms: resources.terms.filter((term) => term.status === "open")
    };
  },
  ["published-family-resources"],
  {
    revalidate: 300,
    tags: ["family-resources"]
  }
);
