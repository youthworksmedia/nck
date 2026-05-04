import { NextResponse } from "next/server";
import path from "node:path";
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
      { message: "Only active Big plan account holders and team members can export slides." },
      { status: 403 }
    );
  }

  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Could not export these slides." }, { status: 400 });
  }

  const { default: PptxGenJS } = await import("pptxgenjs");
  const lesson = payload.data.lesson;
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "New Creation Kids";
  pptx.company = "New Creation Kids";
  pptx.subject = "New lesson tools";
  pptx.title = lesson.title;

  const slideBackgrounds = [
    ["FFF3B0", "FFC94D"],
    ["DDF3FF", "8FC5FF"],
    ["F0E2FF", "B585FF"],
    ["FFE1C7", "FF9C5A"]
  ] as const;

  const addBackground = (slide: any, colorA: string, colorB: string) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 7.5,
      line: { color: colorA, transparency: 100 },
      fill: { color: colorA }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 7.5,
      line: { color: colorB, transparency: 100 },
      fill: { color: colorB, transparency: 28 },
      rotate: 8
    });
    slide.addShape(pptx.ShapeType.arc, {
      x: 9.7,
      y: -0.6,
      w: 4.4,
      h: 2.4,
      line: { color: "FFFFFF", transparency: 100 },
      fill: { color: "FFFFFF", transparency: 58 }
    });
  };

  const logoPath = path.join(process.cwd(), "public", "pdf-logo.png");
  const dogPath = path.join(process.cwd(), "public", "pdf-dog.png");

  const addLogo = (slide: any) => {
    slide.addImage({
      path: logoPath,
      x: 0.55,
      y: 0.32,
      w: 1.8,
      h: 0.9
    });
  };

  const addDog = (slide: any) => {
    slide.addImage({
      path: dogPath,
      x: 11.15,
      y: 5.45,
      w: 1.2,
      h: 1.2
    });
  };

  const titleSlide = pptx.addSlide();
  addBackground(titleSlide, "FFE98D", "FFB15A");
  addLogo(titleSlide);
  addDog(titleSlide);
  titleSlide.addText(lesson.title, {
    x: 0.8,
    y: 1.45,
    w: 7.6,
    h: 1.5,
    fontFace: "Trebuchet MS",
    fontSize: 28,
    bold: true,
    color: "143D74",
    margin: 0
  });
  lesson.slidesOutline.forEach((slideText, index) => {
    const slide = pptx.addSlide();
    const [colorA, colorB] = slideBackgrounds[index % slideBackgrounds.length];
    addBackground(slide, colorA, colorB);
    addLogo(slide);
    addDog(slide);
    slide.addText(`Slide ${index + 1}`, {
      x: 0.8,
      y: 1.1,
      w: 2.4,
      h: 0.55,
      fontFace: "Trebuchet MS",
      fontSize: 16,
      bold: true,
      color: "143D74"
    });
    slide.addText(slideText, {
      x: 0.8,
      y: 2.0,
      w: 8.4,
      h: 2.6,
      fontFace: "Trebuchet MS",
      fontSize: 24,
      bold: true,
      color: "20324D",
      valign: "middle",
      margin: 0.06
    });
  });

  const data = await pptx.write({ outputType: "nodebuffer" });

  return new NextResponse(new Uint8Array(data as Buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(`${lesson.title}.pptx`)}"`
    }
  });
}
