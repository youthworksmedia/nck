import { NextResponse } from "next/server";
import { z } from "zod";

import { canUseLessonBuilder } from "@/lib/lesson-builder-access";
import { lessonPlanSchema } from "@/lib/lesson-builder";

const schema = z.object({
  lesson: lessonPlanSchema
});

export async function POST(request: Request) {
  const access = await canUseLessonBuilder();

  if (!access.allowed) {
    return NextResponse.json(
      { message: "Only active Big plan account holders and team members can export the teacher guide." },
      { status: 403 }
    );
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Could not export this teacher guide." }, { status: 400 });
  }

  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun
  } = await import("docx");

  const lesson = payload.data.lesson;
  const fontName = "Trebuchet MS";

  const bulletParagraphs = (items: string[]) =>
    items.map(
      (item) =>
        new Paragraph({
          children: [
            new TextRun({
              text: item,
              font: fontName,
              color: "20324D"
            })
          ],
          bullet: {
            level: 0
          },
          spacing: {
            after: 120
          }
        })
    );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "New Creation Kids",
                bold: true,
                color: "143D74",
                size: 30,
                font: fontName
              })
            ]
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: lesson.title,
                bold: true,
                color: "143D74",
                font: fontName
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({
                text: "Teacher manual",
                bold: true,
                color: "FF8D2F",
                size: 28,
                font: fontName
              }),
              new TextRun({
                text: " | Built for reformed evangelical churches - Living for Jesus, Loving Like Jesus.",
                color: "20324D",
                size: 24,
                font: fontName
              })
            ]
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Lesson overview" }),
          new Paragraph({
            spacing: { after: 220 },
            children: [new TextRun({ text: lesson.lessonOverview, font: fontName, color: "20324D" })]
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Teaching outline" }),
          ...bulletParagraphs(lesson.teachingOutline),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Discussion questions" }),
          ...bulletParagraphs(lesson.discussionQuestions),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Interactive activity" }),
          new Paragraph({
            spacing: { after: 220 },
            children: [new TextRun({ text: lesson.interactiveActivity, font: fontName, color: "20324D" })]
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Prayer and reflection" }),
          new Paragraph({
            spacing: { after: 220 },
            children: [new TextRun({ text: lesson.prayerReflection, font: fontName, color: "20324D" })]
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Assessment questions" }),
          ...bulletParagraphs(lesson.assessmentQuestions),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Teacher guide" }),
          ...lesson.teacherGuide.split("\n").map(
            (entry) =>
              new Paragraph({
                children: [new TextRun({ text: entry || " ", font: fontName, color: "20324D" })]
              })
          )
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const buffer = Buffer.from(await blob.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(`${lesson.title}-teacher-manual.docx`)}"`
    }
  });
}
