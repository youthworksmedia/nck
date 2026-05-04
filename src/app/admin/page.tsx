import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Admin",
  description: "Admin area for New Creation Kids."
});

export default function AdminPage() {
  redirect("/account");
}
