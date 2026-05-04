import { z } from "zod";

import type { LessonBuilderInput, LessonPlan, SavedLesson } from "@/types";

export const lessonBuilderInputSchema = z.object({
  passage: z.string().min(2, "Enter a Bible passage."),
  ageGroup: z.string().min(2, "Enter an age group."),
  lessonLength: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  learningGoal: z.enum(["faith formation", "discussion", "apologetics", "character"])
});

export const lessonPlanSchema = z.object({
  title: z.string().min(2),
  lessonOverview: z.string().min(10),
  teachingOutline: z.array(z.string().min(2)).min(3),
  discussionQuestions: z.array(z.string().min(2)).min(3),
  interactiveActivity: z.string().min(10),
  prayerReflection: z.string().min(10),
  assessmentQuestions: z.array(z.string().min(2)).min(3),
  slidesOutline: z.array(z.string().min(2)).min(4),
  teacherGuide: z.string().min(20)
});

export const lessonBuilderRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("generate"),
    input: lessonBuilderInputSchema
  }),
  z.object({
    mode: z.literal("regenerate"),
    input: lessonBuilderInputSchema,
    section: z.enum([
      "lessonOverview",
      "teachingOutline",
      "discussionQuestions",
      "interactiveActivity",
      "prayerReflection",
      "assessmentQuestions",
      "slidesOutline",
      "teacherGuide"
    ]),
    currentLesson: lessonPlanSchema
  })
]);

function ensureString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function ensureArray(value: unknown, fallback: string[], minimum: number) {
  const cleaned = Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    : [];

  const next = cleaned.length ? cleaned : [...fallback];

  while (next.length < minimum) {
    next.push(fallback[(next.length % fallback.length)] ?? fallback[fallback.length - 1] ?? "Add item");
  }

  return next;
}

export function normalizeLessonPlan(value: unknown): LessonPlan {
  const data = (value ?? {}) as Record<string, unknown>;

  return {
    title: ensureString(data.title, "Lesson Plan"),
    lessonOverview: ensureString(
      data.lessonOverview,
      "A practical, biblically grounded lesson overview is still being prepared."
    ),
    teachingOutline: ensureArray(
      data.teachingOutline,
      [
        "Introduce the passage and lesson goal.",
        "Explain the text carefully in context.",
        "Apply the passage with clear discussion and response."
      ],
      3
    ),
    discussionQuestions: ensureArray(
      data.discussionQuestions,
      [
        "What stands out in the passage?",
        "What does this teach us about God or Jesus?",
        "How should this change the way we live?"
      ],
      3
    ),
    interactiveActivity: ensureString(
      data.interactiveActivity,
      "Run a short small-group activity that helps students connect the passage to a real-life situation."
    ),
    prayerReflection: ensureString(
      data.prayerReflection,
      "Close with a short prayer and reflection based on the lesson truth."
    ),
    assessmentQuestions: ensureArray(
      data.assessmentQuestions,
      [
        "What is the main message of the passage?",
        "What does this passage teach about God, Jesus, or the gospel?",
        "What is one response you can make this week?"
      ],
      3
    ),
    slidesOutline: ensureArray(
      data.slidesOutline,
      [
        "Title slide",
        "Big idea",
        "Bible reading",
        "Key takeaway"
      ],
      4
    ),
    teacherGuide: ensureString(
      data.teacherGuide,
      "Teacher guide content is still being prepared. Use the outline, questions, and activity sections to run the lesson."
    )
  };
}

export function buildLessonBuilderPrompt(input: LessonBuilderInput) {
  return [
    "You are an expert Christian curriculum writer and teacher co-pilot.",
    "Write for Christian school teachers teaching students aged 10-16.",
    "Create a complete classroom-ready lesson plan that is biblically faithful, practical, age-appropriate, and engaging.",
    "Only generate lessons that are clearly Christian, scripture-centred, and suitable for church or Christian school teaching.",
    "The lesson topic must stay anchored in a Bible passage, a clearly Christian doctrine, a Christian character theme grounded in Scripture, or faithful Christian discipleship.",
    "Do not generate lessons about inappropriate, sexualised, occult, violent, abusive, hateful, extremist, crude, or non-Christian spiritual topics.",
    "Do not treat secular pop-culture themes, politics, self-help ideas, or generic wellbeing themes as lesson topics unless they are clearly and directly subordinated to the Bible passage and Christian teaching goal.",
    "If the requested topic is vague, push the lesson back toward the stated Bible passage and explicitly Christian teaching.",
    "The lesson must reflect reformed protestant theology in the broad Moore College, SMBC, Sydney Anglican, and Youthworks tradition.",
    "Prioritize faithful exegesis, the authority of Scripture, the centrality of Christ, grace, repentance, faith, discipleship, and mission.",
    "Use a warm, clear, evangelical tone with a missional focus and strong application to life and witness.",
    "Avoid vague moralism, theological liberalism, prosperity teaching, sacramentalism, or devotional fluff detached from the biblical text.",
    "Use strong pedagogy for students aged 10-16: clear learning intentions, scaffolded explanation, retrieval, discussion, interactive participation, and age-appropriate application.",
    "Make the interactive activity genuinely fun, purposeful, and easy for a teacher to run in a classroom.",
    "Keep the lesson practical for real teachers: simple transitions, strong flow, and no unnecessary jargon.",
    "Write all student-facing material in age-appropriate language that works well for children and young teens.",
    "Write all teacher-facing material, especially the teacher guide and teaching notes, at an adult teacher level with clear instructional language.",
    "Use standard Australian English spelling, punctuation, and wording for the Australian church and school market, following Macquarie Dictionary style where relevant.",
    "Where suitable, include interactive learning that helps students think, remember, and respond: retrieval prompts, quizzes, word games, puzzle ideas, sequencing, matching, observation tasks, and age-appropriate problem-solving.",
    "When worksheet-style tasks are implied, prefer activities that make students use their brains actively, remember key truths, and engage the Bible passage rather than passive busywork.",
    "Teacher-facing content should include the expected answers, answer guides, or solution direction for quizzes, puzzles, worksheet tasks, and discussion prompts.",
    `Bible passage: ${input.passage}`,
    `Age group: ${input.ageGroup}`,
    `Lesson length: ${input.lessonLength} minutes`,
    `Learning goal: ${input.learningGoal}`,
    "Return structured content that is warm, clear, and easy for a teacher to run immediately.",
    "Keep teaching outline and slide outline concise and sequenced.",
    "Discussion and assessment questions should be suitable for group use.",
    "Aim for theological depth with classroom clarity."
  ].join("\n");
}

export function buildRegeneratePrompt(
  input: LessonBuilderInput,
  lesson: LessonPlan,
  section: string
) {
  return [
    "You are updating one section of an existing Christian lesson plan.",
    "Keep the lesson clearly Christian, scripture-centred, and suitable for church or Christian school teaching.",
    "Do not introduce inappropriate, sexualised, occult, violent, abusive, hateful, extremist, crude, or non-Christian spiritual material.",
    "Do not drift into generic secular self-help, politics, or pop-culture themes unless they are clearly subordinated to the Bible passage and Christian teaching goal.",
    "If there is any ambiguity, resolve it by moving the section back toward the Bible passage and faithful Christian doctrine.",
    "Keep the theology reformed protestant, biblically grounded, Christ-centered, and aligned with the broad Moore College, SMBC, Sydney Anglican, and Youthworks tradition.",
    "Preserve the lesson's missional focus, interactive feel, and strong teaching method.",
    "Use sound pedagogy for students aged 10-16: clarity, engagement, discussion, and practical application.",
    "Keep student-facing material age-appropriate and teacher-facing material clearly written for adult leaders.",
    "Use standard Australian English for the Australian market, following Macquarie Dictionary conventions where relevant.",
    "Preserve or strengthen activities that help students remember, think, solve, discuss, and engage actively with the passage.",
    "Keep teacher-facing content clear about likely answers or solution guidance where worksheet, quiz, or puzzle tasks are involved.",
    `Bible passage: ${input.passage}`,
    `Age group: ${input.ageGroup}`,
    `Lesson length: ${input.lessonLength} minutes`,
    `Learning goal: ${input.learningGoal}`,
    `Section to regenerate: ${section}`,
    "Keep the new section aligned with the rest of the lesson.",
    "Do not rewrite the other sections.",
    `Current lesson JSON:\n${JSON.stringify(lesson, null, 2)}`
  ].join("\n");
}

export function buildLessonFromFallback(input: LessonBuilderInput): LessonPlan {
  return {
    title: `${input.passage} Lesson Plan`,
    lessonOverview: `This lesson helps students explore ${input.passage} with a clear, Christ-centred, biblically grounded approach shaped by reformed evangelical convictions. It is built for ${input.ageGroup} and aims to grow students in ${input.learningGoal} through strong teaching, discussion, and practical response.`,
    teachingOutline: [
      `Welcome students and introduce the Bible passage ${input.passage} with a clear learning goal.`,
      "Read the text together, explain the passage in context, and draw out the main gospel truth.",
      "Use worked examples and clear explanation to show what the passage teaches about God, people, and faithful living.",
      "Guide students into discussion, retrieval, and practical application with a missional edge.",
      "Finish with prayer, reflection, and a clear takeaway for life this week."
    ],
    discussionQuestions: [
      "What stands out to you most in this passage, and why?",
      "What does this passage teach us about God, Jesus, or the gospel?",
      "How should this truth shape the way we live and speak about Jesus this week?"
    ],
    interactiveActivity:
      "Place students into pairs or small groups and give each group a real-life scenario from school, friendship, or family life. Ask them to connect the scenario to the passage, identify the key biblical truth, and prepare a short response showing how a Christian could act with faith, wisdom, and gospel-shaped character.",
    prayerReflection:
      "Invite students to spend one minute quietly reflecting on what the passage reveals about God and how they need his grace. Close with a short guided prayer asking for repentance, trust, courage, and help to live as faithful witnesses this week.",
    assessmentQuestions: [
      "What is the main message of the passage?",
      "What is one truth this passage teaches about God, Jesus, or the gospel?",
      "What is one concrete way this lesson should shape your life this week?"
    ],
    slidesOutline: [
      `Title slide: ${input.passage}`,
      "Lesson goal and big idea",
      "Bible passage reading",
      "Teaching points",
      "Discussion questions",
      "Activity instructions",
      "Prayer and reflection",
      "Assessment and takeaway"
    ],
    teacherGuide:
      `Teacher guide for ${input.passage}\n\nStart by welcoming students and clearly introducing the lesson goal around ${input.learningGoal}. Read the passage in context, explain the text carefully, and keep the main point anchored in Scripture and centred on Christ. Use clear instruction, retrieval, discussion, and practical examples that connect with the world of ${input.ageGroup}. Move into an activity that is fun, purposeful, and discussion-rich. Finish with prayer, reflection, and a short check for understanding that helps students express the main truth and a real next step.`
  };
}

export const lessonPlanJsonSchema = {
  name: "lesson_plan",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      lessonOverview: { type: "string" },
      teachingOutline: {
        type: "array",
        items: { type: "string" }
      },
      discussionQuestions: {
        type: "array",
        items: { type: "string" }
      },
      interactiveActivity: { type: "string" },
      prayerReflection: { type: "string" },
      assessmentQuestions: {
        type: "array",
        items: { type: "string" }
      },
      slidesOutline: {
        type: "array",
        items: { type: "string" }
      },
      teacherGuide: { type: "string" }
    },
    required: [
      "title",
      "lessonOverview",
      "teachingOutline",
      "discussionQuestions",
      "interactiveActivity",
      "prayerReflection",
      "assessmentQuestions",
      "slidesOutline",
      "teacherGuide"
    ]
  },
  strict: true
} as const;

export const savedLessonRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  title: z.string(),
  passage: z.string(),
  age_group: z.string(),
  lesson_length: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  learning_goal: z.enum(["faith formation", "discussion", "apologetics", "character"]),
  created_by_email: z.string(),
  is_shared: z.boolean(),
  lesson_data: lessonPlanSchema,
  updated_at: z.string()
});

export function mapSavedLesson(
  row: z.infer<typeof savedLessonRowSchema>,
  currentUserId: string
): SavedLesson {
  return {
    id: row.id,
    title: row.title,
    input: {
      passage: row.passage,
      ageGroup: row.age_group,
      lessonLength: row.lesson_length,
      learningGoal: row.learning_goal
    },
    lesson: row.lesson_data,
    updatedAt: row.updated_at,
    createdByEmail: row.created_by_email,
    isShared: row.is_shared,
    isEditable: row.user_id === currentUserId
  };
}
