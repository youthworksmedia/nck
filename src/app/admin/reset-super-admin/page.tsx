import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ResetSuperAdminForm } from "@/components/reset-super-admin-form";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Reset super admin password",
  description: "Reset a super admin password for New Creation Kids."
});

export default function ResetSuperAdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell section">
        <ResetSuperAdminForm />
      </main>
      <SiteFooter />
    </>
  );
}
