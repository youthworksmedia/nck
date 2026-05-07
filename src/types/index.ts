import type { PlanTier } from "@/lib/plans";

export type LessonResourceType = "pdf" | "game" | "music" | "video";

export type LessonResourceAttachment = {
  id: string;
  type: LessonResourceType;
  name: string;
  filePath: string;
  fileName: string;
};

export type Resource = {
  id: string;
  title: string;
  description: string;
  lessonNumber?: number;
  scripture?: string;
  yearCycle?: "Year A" | "Year B" | "Year C";
  term?: "Term 1" | "Term 2" | "Term 3" | "Term 4";
  musicAvailable?: boolean;
  worksheetAvailable?: boolean;
  manualAvailable?: boolean;
  musicFilePath?: string;
  worksheetFilePath?: string;
  manualFilePath?: string;
  musicFileName?: string;
  worksheetFileName?: string;
  manualFileName?: string;
  attachments?: LessonResourceAttachment[];
  publishDate?: string | null;
  expiryDate?: string | null;
  status?: "open" | "closed";
};

export type CurriculumTermNote = {
  yearCycle: "Year A" | "Year B" | "Year C";
  term: "Term 1" | "Term 2" | "Term 3" | "Term 4";
  content: string;
};

export type LessonBuilderInput = {
  passage: string;
  ageGroup: string;
  lessonLength: 30 | 45 | 60;
  learningGoal: "faith formation" | "discussion" | "apologetics" | "character";
};

export type LessonPlan = {
  title: string;
  lessonOverview: string;
  teachingOutline: string[];
  discussionQuestions: string[];
  interactiveActivity: string;
  prayerReflection: string;
  assessmentQuestions: string[];
  slidesOutline: string[];
  teacherGuide: string;
};

export type SavedLesson = {
  id: string;
  title: string;
  input: LessonBuilderInput;
  lesson: LessonPlan;
  updatedAt: string;
  createdByEmail: string;
  createdByName?: string;
  isShared: boolean;
  isEditable: boolean;
};

export type ResourceCategory = {
  id: string;
  name: string;
};

export type TeamMember = {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  role: "owner" | "member";
  status: "active" | "invited";
  joinedAt: string;
};

export type MembershipSnapshot = {
  organizationName: string;
  churchName: string;
  accountHolderName?: string;
  planTier: PlanTier;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "inactive";
  renewalDate: string;
  memberCount: number;
};

export type AccountHolderSummary = {
  organizationId: string;
  organizationName: string;
  churchName: string;
  planTier: PlanTier;
  accountHolderName: string;
  accountHolderEmail: string;
  joinedAt: string;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "inactive";
  teamMembers: TeamMember[];
};

export type SuperAdminSummary = {
  userId: string;
  email: string;
  displayName: string;
  role: "super_admin";
  createdAt: string;
};

export type PurchaseOrderSummary = {
  id: string;
  orderNumber: string;
  organizationId: string | null;
  accountHolderName: string;
  accountHolderEmail: string;
  churchName: string;
  planTier: PlanTier;
  amount: number;
  currency: string;
  paymentStatus: "paid" | "pending" | "failed";
  paymentProvider: string;
  cardBrand: string;
  cardLast4: string;
  billingAddressLine1: string;
  billingSuburb: string;
  billingState: string;
  billingPostcode: string;
  billingCountry: string;
  billingPhone: string;
  createdAt: string;
};

export type CheckoutProfile = {
  accountHolderName: string;
  churchName: string;
  email: string;
  phone: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
};

export * from "@/types/weather";
