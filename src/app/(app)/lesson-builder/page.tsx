import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Lessons",
  description: "Browse New Creation Kids lessons and resources."
});

export default function LessonBuilderPage() {
  redirect("/resources");
}
