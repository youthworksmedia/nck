import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  buildLessonBuilderPrompt,
  buildLessonFromFallback,
  buildRegeneratePrompt,
  lessonBuilderRequestSchema,
  lessonPlanJsonSchema,
  lessonPlanSchema,
  normalizeLessonPlan
} from "@/lib/lesson-builder";
import { planAllowsLessonBuilder } from "@/lib/plans";
import { getMembershipSnapshot, isCurrentUserOwner, isCurrentUserTeamMember } from "@/lib/portal";

function getResponseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (payload?.output_parsed) {
    return JSON.stringify(payload.output_parsed);
  }

  const assistantMessage = payload?.output?.find((item: any) => item?.type === "message");

  if (!assistantMessage?.content?.length) {
    return "";
  }

  const textParts = assistantMessage.content
    .map((entry: any) => {
      if (typeof entry?.text === "string") {
        return entry.text;
      }

      if (entry?.type === "output_text" && typeof entry?.text === "string") {
        return entry.text;
      }

      if (entry?.parsed) {
        return JSON.stringify(entry.parsed);
      }

      return "";
    })
    .filter(Boolean);

  return textParts.join("\n").trim();
}

async function generateLessonViaOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_LESSON_BUILDER_MODEL || "gpt-5-mini";

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: lessonPlanJsonSchema.name,
          schema: lessonPlanJsonSchema.schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Lesson generation failed.");
  }

  const payload = await response.json();
  const outputText = getResponseText(payload);

  if (!outputText) {
    throw new Error("No lesson content returned by the model.");
  }

  return lessonPlanSchema.parse(normalizeLessonPlan(JSON.parse(outputText)));
}

export async function POST(request: Request) {
  const [isOwner, isTeamMember, isSuperAdmin, membership] = await Promise.all([
    isCurrentUserOwner(),
    isCurrentUserTeamMember(),
    isCurrentUserSuperAdmin(),
    getMembershipSnapshot()
  ]);

  if (isSuperAdmin || (!isOwner && !isTeamMember)) {
    return NextResponse.json(
      { message: "Only active account holders or team members can use the New lesson tools." },
      { status: 403 }
    );
  }

  if (!["active", "trialing"].includes(membership.subscriptionStatus)) {
    return NextResponse.json(
      { message: "An active membership is required to use the New lesson tools." },
      { status: 403 }
    );
  }

  if (!planAllowsLessonBuilder(membership.planTier)) {
    return NextResponse.json(
      { message: "New lesson tools is included on the Big plan only." },
      { status: 403 }
    );
  }

  const payload = lessonBuilderRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Enter the lesson tools fields correctly." }, { status: 400 });
  }

  try {
    if (payload.data.mode === "generate") {
      const lesson =
        (await generateLessonViaOpenAI(buildLessonBuilderPrompt(payload.data.input))) ??
        buildLessonFromFallback(payload.data.input);

      return NextResponse.json({
        lesson,
        usedFallback: !process.env.OPENAI_API_KEY
      });
    }

    const regenerated =
      (await generateLessonViaOpenAI(
        buildRegeneratePrompt(payload.data.input, payload.data.currentLesson, payload.data.section)
      )) ?? buildLessonFromFallback(payload.data.input);

    const nextLesson = normalizeLessonPlan({
      ...payload.data.currentLesson,
      [payload.data.section]: regenerated[payload.data.section]
    });

    return NextResponse.json({
      lesson: lessonPlanSchema.parse(nextLesson),
      usedFallback: !process.env.OPENAI_API_KEY
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not build the lesson." },
      { status: 400 }
    );
  }
}
