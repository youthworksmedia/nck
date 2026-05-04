import { NextResponse } from "next/server";

import { plans, planAllowsLessonBuilder } from "@/lib/plans";
import {
  getAccountHolderEmail,
  getCurrentUser,
  getMembershipSnapshot,
  getResources,
  getTeamMembers,
  isCurrentUserOwner,
  isCurrentUserTeamMember
} from "@/lib/portal";

type IncomingMessage = {
  role: "assistant" | "user";
  content: string;
};

const requestSchema = {
  parse(body: any) {
    if (!Array.isArray(body?.messages)) {
      throw new Error("Please send a valid chat message.");
    }

    const messages = body.messages
      .map((message: any) => ({
        role: message?.role,
        content: typeof message?.content === "string" ? message.content.trim() : ""
      }))
      .filter((message: IncomingMessage) => message.role && message.content);

    if (!messages.length) {
      throw new Error("Please send a valid chat message.");
    }

    return {
      messages: messages.slice(-8) as IncomingMessage[]
    };
  }
};

function getResponseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const assistantMessage = payload?.output?.find((item: any) => item?.type === "message");

  if (!assistantMessage?.content?.length) {
    return "";
  }

  return assistantMessage.content
    .map((entry: any) => {
      if (typeof entry?.text === "string") {
        return entry.text;
      }

      if (entry?.type === "output_text" && typeof entry?.text === "string") {
        return entry.text;
      }

      return "";
    })
    .join("\n")
    .trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildPublicContext() {
  const planSummary = plans
    .map((plan) => `${plan.name}: $${plan.annualPrice}/year. ${plan.audience}`)
    .join("\n");

  return `
Public website information:
- Website name: New Creation Kids.
- Tone: joyful Christian content for churches, leaders, parents, and families.
- Main public navigation areas: Lessons, Faith, Joy, Explore, Parents.
- Homepage promise: Amazing fun Christian content with engaging Sunday School lessons kids will love.
- Public feature highlights: new lessons every week; fun videos and activities; print-at-home worksheets.
- Every plan includes the full curriculum library.
- Public membership plans:
${planSummary}
- Public account actions: visitors can browse the homepage, pricing-style membership options, and log in.
- Team management, account settings, resources, and the lesson tools are member areas and should not be described as publicly available unless the user is logged in.
`.trim();
}

function buildMemberContext(input: {
  email: string | null | undefined;
  isOwner: boolean;
  isTeamMember: boolean;
  accountHolderEmail: string | null;
  membership: Awaited<ReturnType<typeof getMembershipSnapshot>>;
  resources: Awaited<ReturnType<typeof getResources>>;
  teamMembers: Awaited<ReturnType<typeof getTeamMembers>>;
}) {
  const resourceSummary = input.resources.length
    ? input.resources
        .slice(0, 40)
        .map(
          (resource) =>
            `- Lesson #${resource.lessonNumber ?? 1}: ${resource.title} | ${(resource.yearCycle ?? "Year A")} | ${(resource.term ?? "Term 1")} | scripture: ${resource.scripture || "not listed"}`
        )
        .join("\n")
    : "- No published member resources are available right now.";

  const teamSummary = input.isOwner
    ? input.teamMembers.length
      ? input.teamMembers
          .map(
            (member) =>
              `- ${member.email} (${member.role === "owner" ? "account holder" : "team member"})`
          )
          .join("\n")
      : "- No team members have been added yet."
    : `- Team member account. Account holder email: ${input.accountHolderEmail ?? "not available"}.`;

  return `
Member-only information for the current signed-in user:
- Signed-in email: ${input.email ?? "unknown"}.
- Organization/account name: ${input.membership.organizationName}.
- Membership status: ${input.membership.subscriptionStatus}.
- Renewal date: ${input.membership.renewalDate}.
- Current user role: ${
    input.isOwner ? "account holder" : input.isTeamMember ? "team member" : "member without team role"
  }.
- Account holders can manage team access and see the team page.
- Both account holders and team members can access resources while the membership is active.
- New lesson tools is included only on the Big plan.
- This account ${planAllowsLessonBuilder(input.membership.planTier) ? "does include" : "does not include"} New lesson tools access.
- When available, New lesson tools can generate lesson overviews, teaching outlines, discussion questions, activities, prayer/reflection, and assessment questions.
- Saved lessons can be shared with the team, and only the creator can edit or delete their own saved lesson.
- Available member resources:
${resourceSummary}
- Team details:
${teamSummary}
`.trim();
}

function buildPrompt(context: string, messages: IncomingMessage[]) {
  const conversation = messages
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  return `
You are Alfi, the friendly helper for the New Creation Kids website.

Your job:
- Answer warmly and simply.
- Only answer using the website context provided below.
- If the answer is not supported by the context, say you cannot see that information from this website and gently suggest a relevant page or next step if possible.
- Do not invent theology, curriculum content, policy details, pricing, or account data that is not in the context.
- Do not answer general world knowledge questions, Bible questions, or anything outside the New Creation Kids website.
- If the user is logged out, stay within public website information only.
- Keep answers concise and practical. Usually 2 to 5 sentences.

Website context:
${context}

Conversation:
${conversation}
`.trim();
}

async function generateAnswer(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_ALFI_MODEL || process.env.OPENAI_LESSON_BUILDER_MODEL || "gpt-5-mini";

  if (!apiKey) {
    return "I can help with New Creation Kids pages and resources, but the chat assistant is not fully connected yet because the OpenAI API key is missing.";
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Alfi could not answer right now.");
  }

  const payload = await response.json();
  const answer = getResponseText(payload);

  if (!answer) {
    throw new Error("Alfi could not find an answer right now.");
  }

  return answer;
}

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const publicContext = buildPublicContext();
    const user = await getCurrentUser();

    let context = publicContext;

    if (user) {
      const [membership, isOwner, isTeamMember, accountHolderEmail, resources, teamMembers] =
        await Promise.all([
          getMembershipSnapshot(),
          isCurrentUserOwner(),
          isCurrentUserTeamMember(),
          getAccountHolderEmail(),
          getResources(),
          getTeamMembers()
        ]);

      context = [publicContext, buildMemberContext({
        email: user.email,
        isOwner,
        isTeamMember,
        accountHolderEmail,
        membership,
        resources: resources.map((resource) => ({
          ...resource,
          description: stripHtml(resource.description)
        })),
        teamMembers
      })].join("\n\n");
    }

    const answer = await generateAnswer(buildPrompt(context, payload.messages));

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Alfi could not answer right now. Please try again."
      },
      { status: 400 }
    );
  }
}
