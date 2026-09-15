import { cache } from "react";
import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { HelpFaqItem, HelpFaqSection } from "@/types";

export const demoHelpFaqs: HelpFaqSection[] = [
  {
    id: "class-room",
    title: "Class room",
    description: "Questions about running lessons with children and leaders.",
    displayOrder: 1,
    status: "open",
    visibleToAccountHolders: true,
    visibleToTeamMembers: true,
    items: [
      {
        id: "class-room-1",
        sectionId: "class-room",
        question: "How should I adapt a lesson for a mixed-age group?",
        answerHtml:
          "<p>Start with the main Bible idea, then choose one activity that younger children can enter easily and one discussion question that gives older children room to go deeper.</p>",
        displayOrder: 1,
        status: "open"
      },
      {
        id: "class-room-2",
        sectionId: "class-room",
        question: "Can team members download resources during the week?",
        answerHtml:
          "<p>Yes. Invited team members with an active account can access the teaching library and download the resources they need for preparation.</p>",
        displayOrder: 2,
        status: "open"
      }
    ]
  },
  {
    id: "preparation",
    title: "Preparation",
    description: "Planning, printing, and leader preparation guidance.",
    displayOrder: 2,
    status: "open",
    visibleToAccountHolders: true,
    visibleToTeamMembers: true,
    items: [
      {
        id: "preparation-1",
        sectionId: "preparation",
        question: "How far ahead should leaders prepare?",
        answerHtml:
          "<p>We recommend downloading the lesson at least one week ahead so leaders have time to read the passage, gather materials, and pray through the session.</p>",
        displayOrder: 1,
        status: "open"
      },
      {
        id: "preparation-2",
        sectionId: "preparation",
        question: "What should be printed for Sunday?",
        answerHtml:
          "<p>Print the leader guide for each teacher and enough activity sheets for the children in your group. Keep a spare copy for new leaders or unexpected helpers.</p>",
        displayOrder: 2,
        status: "open"
      }
    ]
  },
  {
    id: "technical",
    title: "Technical",
    description: "Account, login, download, and browser support.",
    displayOrder: 3,
    status: "open",
    visibleToAccountHolders: true,
    visibleToTeamMembers: true,
    items: [
      {
        id: "technical-1",
        sectionId: "technical",
        question: "What should I do if a download does not open?",
        answerHtml:
          "<p>Try downloading again in a current browser. If the file still will not open, ask your account holder to check that the subscription is active and contact support with the lesson title.</p>",
        displayOrder: 1,
        status: "open"
      },
      {
        id: "technical-2",
        sectionId: "technical",
        question: "How does an invited member reset their password?",
        answerHtml:
          "<p>Use the missing password link on the login page. Account holders can also reset team member passwords from the Team page.</p>",
        displayOrder: 2,
        status: "open"
      },
      {
        id: "technical-copyright",
        sectionId: "technical",
        question: "What does copyrights mean?",
        answerHtml:
          "<p>Copyright explains who owns the lesson materials, artwork, downloads, and other resources on New Creation Kids. For now, please treat this as a placeholder support note: your subscription allows your church team to use the resources for ministry, while the original content remains owned by Youthworks.</p>",
        displayOrder: 3,
        status: "open"
      }
    ]
  }
];

function mapItem(row: Record<string, unknown>): HelpFaqItem {
  return {
    id: String(row.id),
    sectionId: String(row.section_id),
    question: String(row.question ?? ""),
    answerHtml: String(row.answer_html ?? ""),
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

export const getAdminHelpFaqs = cache(async function getAdminHelpFaqs(): Promise<HelpFaqSection[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return demoHelpFaqs;
  }

  const [{ data: sections }, { data: items }] = await Promise.all([
    adminSupabase
      .from("help_faq_sections")
      .select("*")
      .order("display_order", { ascending: true }),
    adminSupabase
      .from("help_faq_items")
      .select("*")
      .order("display_order", { ascending: true })
  ]);

  if (!sections?.length) {
    return [];
  }

  const itemsBySection = new Map<string, HelpFaqItem[]>();
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
    visibleToAccountHolders: section.visible_to_account_holders !== false,
    visibleToTeamMembers: section.visible_to_team_members !== false,
    items: itemsBySection.get(section.id) ?? []
  }));
});

export async function getPublishedHelpFaqs(audience?: "account_holder" | "team_member" | "all") {
  return getCachedPublishedHelpFaqs(audience ?? "all");
}

const getCachedPublishedHelpFaqs = unstable_cache(
  async function getCachedPublishedHelpFaqs(audience: "account_holder" | "team_member" | "all") {
    const sections = await getAdminHelpFaqs();

    return sections
      .filter((section) => section.status === "open")
      .filter((section) => {
        if (audience === "account_holder") {
          return section.visibleToAccountHolders;
        }

        if (audience === "team_member") {
          return section.visibleToTeamMembers;
        }

        return true;
      })
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.status === "open")
      }))
      .filter((section) => section.items.length);
  },
  ["published-help-faqs"],
  {
    revalidate: 300,
    tags: ["help-faqs"]
  }
);
