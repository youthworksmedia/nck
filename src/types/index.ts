import type { PlanTier } from "@/lib/plans";
import type { CurriculumSection, CurriculumYear } from "@/lib/curriculum";
import type { DiscountCode } from "@/lib/discounts";

export type LessonResourceType = "pdf" | "game" | "music" | "video";

export type LessonResourceAttachment = {
  id: string;
  type: LessonResourceType;
  icon?: string;
  name: string;
  filePath: string;
  fileName: string;
  sizeBytes?: number;
  includeCopyright?: boolean;
};

export type LessonResourceProgramKey = "schoolAge" | "preschool";

export type LessonPodcastLink = {
  id: string;
  label: string;
  url: string;
};

export type Resource = {
  id: string;
  title: string;
  description: string;
  lessonNumber?: number;
  scripture?: string;
  bigIdea?: string;
  podcastTitle?: string;
  podcastLinks?: LessonPodcastLink[];
  yearCycle?: CurriculumYear;
  term?: CurriculumSection;
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
  preschoolAttachments?: LessonResourceAttachment[];
  publishDate?: string | null;
  expiryDate?: string | null;
  status?: "open" | "closed";
};

export type CurriculumTermNote = {
  yearCycle: CurriculumYear;
  term: CurriculumSection;
  content: string;
};

export type CurriculumUnitGraphic = {
  id: string;
  yearCycle: CurriculumYear;
  term: CurriculumSection;
  title: string;
  description: string;
  icon: string;
  filePath?: string | null;
  fileName?: string | null;
  includeCopyright?: boolean;
  displayOrder: number;
  status: "open" | "closed";
};

export type CurriculumUnitOverview = {
  id: string;
  yearCycle: CurriculumYear;
  term: CurriculumSection;
  eyebrow: string;
  title: string;
  subtitle: string;
  heroImagePath?: string | null;
  heroImageName?: string | null;
  overviewHtml: string;
  introVideoTitle: string;
  introVideoMeta: string;
  introVideoDescription: string;
  introVideoUrl?: string | null;
  deepDiveVideoTitle: string;
  deepDiveVideoMeta: string;
  deepDiveVideoDescription: string;
  deepDiveVideoUrl?: string | null;
  status: "open" | "closed";
  graphics: CurriculumUnitGraphic[];
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

export type MinistryLeaderResourceItem = {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  icon: string;
  resourceType: "pdf" | "xlsx" | "zip" | "video" | "link" | "coming_soon";
  actionLabel: string;
  filePath?: string | null;
  fileName?: string | null;
  url?: string | null;
  duration?: string | null;
  displayOrder: number;
  status: "open" | "closed";
};

export type MinistryLeaderResourceSection = {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  status: "open" | "closed";
  items: MinistryLeaderResourceItem[];
};

export type HelpFaqItem = {
  id: string;
  sectionId: string;
  question: string;
  answerHtml: string;
  displayOrder: number;
  status: "open" | "closed";
};

export type HelpFaqSection = {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  status: "open" | "closed";
  visibleToAccountHolders: boolean;
  visibleToTeamMembers: boolean;
  items: HelpFaqItem[];
};

export type LeaderResourceItem = {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  eyebrow: string;
  duration?: string | null;
  resourceType: "video" | "pdf" | "guide" | "tool" | "link" | "coming_soon";
  url?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  displayOrder: number;
  status: "open" | "closed";
};

export type LeaderResourceSection = {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  status: "open" | "closed";
  items: LeaderResourceItem[];
};

export type FamilyResourceCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  meta: string;
  displayOrder: number;
  status: "open" | "closed";
};

export type FamilyResourceLesson = {
  id: string;
  term: number;
  lessonNumber: number;
  title: string;
  scripture: string;
  discussionUrl?: string | null;
  activityUrl?: string | null;
  memoryUrl?: string | null;
  memoryText?: string | null;
  displayOrder: number;
  status: "open" | "closed";
};

export type FamilyResourceTerm = {
  id: string;
  term: number;
  memoryText: string;
  memoryUrl?: string | null;
  memoryText2?: string | null;
  memoryUrl2?: string | null;
  readingGuideUrl?: string | null;
  readingGuideCanvaUrl?: string | null;
  parentDevotionUrl?: string | null;
  parentDevotionCanvaUrl?: string | null;
  status: "open" | "closed";
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
  cancelAtPeriodEnd: boolean;
  memberCount: number;
};

export type AccountEngagementMetrics = {
  teamMembersSignedIn: number;
  teamMembersTotal: number;
  totalDownloads: number;
  downloadsThisMonth: number;
  latestDownloadAt?: string | null;
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
  originalAmount: number | null;
  discountCode: string | null;
  discountAmount: number;
  currency: string;
  paymentStatus: "paid" | "pending" | "failed" | "refund_requested" | "refunded";
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

export type AdminDiscountCode = DiscountCode & {
  redemptionCount: number;
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
