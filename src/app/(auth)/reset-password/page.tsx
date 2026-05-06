import type { Metadata } from "next";

import { LoginPageTitle } from "@/components/login-page-title";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { SiteHeader } from "@/components/site-header";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata({
    title: "Create new password",
    description: "Create a new password for your New Creation Kids account."
  }),
  title: {
    absolute: "Create new password"
  }
};

export default function ResetPasswordPage() {
  return (
    <>
      <LoginPageTitle />
      <SiteHeader />
      <main className="site-shell section">
        <ResetPasswordForm />
      </main>
    </>
  );
}
