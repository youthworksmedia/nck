import type { CheckoutProfile, CurriculumTermNote, MembershipSnapshot, Resource, TeamMember } from "@/types";

export const demoOwnerEmail = "robert@kreativ.com.au";
export const demoOwnerEmails = ["robert@kreativ.com.au", "robert.moller@kreativ.com.au"] as const;

export const demoResources: Resource[] = [
  {
    id: "playbook-01",
    title: "God Makes a Good World",
    description: "Children discover that creation is good because God made it and loves what he has made.",
    lessonNumber: 1,
    scripture: "Genesis 1:1-31",
    bigIdea: "Big Idea coming soon.",
    yearCycle: "Volume 1",
    term: "Unit 1",
    musicAvailable: true,
    worksheetAvailable: true,
    manualAvailable: true
  },
  {
    id: "resource-02",
    title: "Jesus Welcomes Children",
    description: "A lesson about the kindness of Jesus and his welcome to children.",
    lessonNumber: 2,
    scripture: "Mark 10:13-16",
    bigIdea: "Big Idea coming soon.",
    yearCycle: "Volume 1",
    term: "Unit 1",
    musicAvailable: true,
    worksheetAvailable: true,
    manualAvailable: true
  },
  {
    id: "resource-03",
    title: "The Good Shepherd",
    description: "Children learn that Jesus knows, leads, and cares for his people.",
    lessonNumber: 3,
    scripture: "John 10:1-18",
    bigIdea: "Big Idea coming soon.",
    yearCycle: "Volume 1",
    term: "Unit 1",
    musicAvailable: false,
    worksheetAvailable: true,
    manualAvailable: true
  }
];

export const demoTermNotes: CurriculumTermNote[] = [
  {
    yearCycle: "Volume 1",
    term: "Unit 1",
    content: "<h2>Unit 1 Summary</h2><p>This unit introduces children to the goodness of God in creation, the welcome of Jesus, and the care of the Good Shepherd.</p><h3>Description</h3><p>Use these lessons to establish core language for your group: God made us, Jesus welcomes us, and we can trust him.</p>"
  }
];

export const demoTeamMembers: TeamMember[] = [
  {
    id: "member-1",
    userId: "demo-user",
    name: "Robert",
    email: demoOwnerEmail,
    role: "owner",
    status: "active",
    joinedAt: "2026-03-01"
  }
];

export const demoMembership: MembershipSnapshot = {
  organizationName: "New Creation Kids",
  churchName: "New Creation Kids",
  accountHolderName: "Robert",
  planTier: "scale",
  subscriptionStatus: "active",
  renewalDate: "2027-03-01",
  cancelAtPeriodEnd: false,
  memberCount: demoTeamMembers.length
};

export const demoCheckoutProfile: CheckoutProfile = {
  accountHolderName: "Robert",
  churchName: "The Bridge Church",
  email: demoOwnerEmail,
  phone: "",
  addressLine1: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "Australia"
};
