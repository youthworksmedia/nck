export const curriculumYears = ["Volume 1"] as const;
export const curriculumSections = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Holiday", "Advent"] as const;

export type CurriculumYear = (typeof curriculumYears)[number];
export type CurriculumSection = (typeof curriculumSections)[number];

export const legacyCurriculumYears = ["Year A", "Year B", "Year C"] as const;
export const legacyCurriculumSections = ["Term 1", "Term 2", "Term 3", "Term 4"] as const;

export type LegacyCurriculumYear = (typeof legacyCurriculumYears)[number];
export type LegacyCurriculumSection = (typeof legacyCurriculumSections)[number];

export type AnyCurriculumYear = CurriculumYear | LegacyCurriculumYear;
export type AnyCurriculumSection = CurriculumSection | LegacyCurriculumSection;

export const curriculumSectionPlan: Record<
  CurriculumYear,
  Record<CurriculumSection, { title: string; weeks: number }>
> = {
  "Volume 1": {
    Holiday: { title: "Identity", weeks: 4 },
    "Unit 1": { title: "Luke - Set Free", weeks: 12 },
    "Unit 2": { title: "Acts", weeks: 12 },
    "Unit 3": { title: "Genesis - In the beginning", weeks: 12 },
    "Unit 4": { title: "Exodus - The second best rescue", weeks: 12 },
    Advent: { title: "Advent", weeks: 4 }
  }
};

export function normalizeCurriculumYear(value?: string | null): CurriculumYear {
  if (value === "Volume 1" || value === "Year 1" || value === "Year A") {
    return "Volume 1";
  }

  return "Volume 1";
}

export function normalizeCurriculumSection(value?: string | null): CurriculumSection {
  if (value === "Holiday" || value === "Summer") {
    return "Holiday";
  }

  if (value === "Advent") {
    return "Advent";
  }

  if (value === "Unit 2" || value === "Quarter 2" || value === "Term 2") {
    return "Unit 2";
  }

  if (value === "Unit 3" || value === "Quarter 3" || value === "Term 3") {
    return "Unit 3";
  }

  if (value === "Unit 4" || value === "Quarter 4" || value === "Term 4") {
    return "Unit 4";
  }

  return "Unit 1";
}

export function isCurrentCurriculumYear(value?: string | null) {
  return curriculumYears.includes(value as CurriculumYear);
}

export function isCurrentCurriculumSection(value?: string | null) {
  return curriculumSections.includes(value as CurriculumSection);
}

export function getCurriculumSectionMeta(year: string, section: string) {
  const normalizedYear = normalizeCurriculumYear(year);
  const normalizedSection = normalizeCurriculumSection(section);

  return curriculumSectionPlan[normalizedYear][normalizedSection];
}

export function curriculumYearStorageValues(year: string): string[] {
  const normalizedYear = normalizeCurriculumYear(year);
  return normalizedYear === "Volume 1" ? [normalizedYear, "Year 1", "Year A"] : [normalizedYear];
}

export function curriculumSectionStorageValues(section: string): string[] {
  const normalizedSection = normalizeCurriculumSection(section);
  if (normalizedSection === "Holiday") {
    return [normalizedSection, "Summer"];
  }

  if (normalizedSection === "Advent") {
    return [normalizedSection];
  }

  const legacySection =
    normalizedSection === "Unit 1"
      ? ["Quarter 1", "Term 1"]
      : normalizedSection === "Unit 2"
        ? ["Quarter 2", "Term 2"]
        : normalizedSection === "Unit 3"
          ? ["Quarter 3", "Term 3"]
          : ["Quarter 4", "Term 4"];

  return [normalizedSection, ...legacySection];
}
