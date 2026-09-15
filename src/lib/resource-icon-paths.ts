import type { LessonResourceProgramKey } from "@/types";

const iconBasePath = "/nck-resource-icons";

export const resourceIconOptions = [
  { value: "lesson-guide", label: "Teaching Guide" },
  { value: "reading-card", label: "Home Reading Card" },
  { value: "teaching-target-complete", label: "Teaching Target complete" },
  { value: "teaching-target-blank", label: "Teaching Target blank" },
  { value: "images", label: "Images" },
  { value: "unit-overview", label: "Unit Overview & Introduction" },
  { value: "unit-games", label: "Unit Activities, Crafts & Games" },
  { value: "unit-logo", label: "Unit Logo" },
  { value: "promo-banners", label: "Promo Banners" },
  { value: "social-tiles", label: "Social Media Graphics" },
  { value: "posters", label: "Big Word Posters" },
  { value: "memory-verse", label: "Memory Verse" },
  { value: "discussion-guide", label: "Family Discussion Guide" },
  { value: "parent-devotion", label: "Parent Devotions" }
] as const;

export const resourceIconKeys = [
  "discussion-guide",
  "images",
  "lesson-guide",
  "memory-verse",
  "parent-devotion",
  "posters",
  "promo-banners",
  "reading-card",
  "social-tiles",
  "teaching-target-blank",
  "teaching-target-complete",
  "unit-games",
  "unit-logo",
  "unit-overview"
] as const;

export type ResourceIconKey = (typeof resourceIconKeys)[number];
type IconAudience = "primary-school" | "preschool" | "family";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getAudience(program: LessonResourceProgramKey | IconAudience): IconAudience {
  return program === "schoolAge" ? "primary-school" : program;
}

function keyFromFileName(fileName?: string | null): ResourceIconKey | null {
  if (!fileName) {
    return null;
  }

  const normalizedFileName = fileName.toLowerCase();
  return resourceIconKeys.find((key) => normalizedFileName.includes(key)) ?? null;
}

function keyFromLabel(label: string): ResourceIconKey | null {
  const normalizedLabel = normalize(label);

  if (normalizedLabel.includes("target") && normalizedLabel.includes("blank")) {
    return "teaching-target-blank";
  }

  if (normalizedLabel.includes("target") && normalizedLabel.includes("complete")) {
    return "teaching-target-complete";
  }

  if (normalizedLabel.includes("discussion")) {
    return "discussion-guide";
  }

  if (normalizedLabel.includes("parent devotion")) {
    return "parent-devotion";
  }

  if (normalizedLabel.includes("memory")) {
    return "memory-verse";
  }

  if (normalizedLabel.includes("reading")) {
    return "reading-card";
  }

  if (normalizedLabel.includes("lesson guide") || normalizedLabel.includes("teaching guide")) {
    return "lesson-guide";
  }

  if (normalizedLabel.includes("image")) {
    return "images";
  }

  if (normalizedLabel.includes("poster")) {
    return "posters";
  }

  if (normalizedLabel.includes("promo")) {
    return "promo-banners";
  }

  if (normalizedLabel.includes("social")) {
    return "social-tiles";
  }

  if (normalizedLabel.includes("unit logo")) {
    return "unit-logo";
  }

  if (normalizedLabel.includes("unit overview") || normalizedLabel.includes("introduction")) {
    return "unit-overview";
  }

  if (normalizedLabel.includes("craft") || normalizedLabel.includes("game") || normalizedLabel.includes("activit")) {
    return "unit-games";
  }

  return null;
}

export function getResourceIconPath(
  label: string,
  fileName: string | null | undefined,
  audience: LessonResourceProgramKey | IconAudience,
  selectedIcon?: string | null
) {
  const iconKey = resourceIconKeys.includes(selectedIcon as ResourceIconKey)
    ? (selectedIcon as ResourceIconKey)
    : keyFromFileName(fileName) ?? keyFromLabel(label);

  if (!iconKey) {
    return null;
  }

  return `${iconBasePath}/nck-${iconKey}-${getAudience(audience)}.png`;
}

export function getResourceIconKey(label: string, fileName?: string | null, selectedIcon?: string | null) {
  return resourceIconKeys.includes(selectedIcon as ResourceIconKey)
    ? (selectedIcon as ResourceIconKey)
    : keyFromFileName(fileName) ?? keyFromLabel(label);
}
