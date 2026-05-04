import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Hidden admin login",
  description: "Hidden admin login route for New Creation Kids."
});

export default async function HiddenAdminLoginPage() {
  redirect("/admin");
}
