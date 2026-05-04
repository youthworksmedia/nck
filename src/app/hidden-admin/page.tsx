import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Hidden admin",
  description: "Hidden admin route for New Creation Kids."
});

export default async function HiddenAdminPage() {
  redirect("/admin");
}
