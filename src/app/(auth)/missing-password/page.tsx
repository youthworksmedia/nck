import type { Metadata } from "next";

import { LoginPageTitle } from "@/components/login-page-title";
import { MissingPasswordForm } from "@/components/missing-password-form";
import { SiteHeader } from "@/components/site-header";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata({
    title: "Reset password",
    description: "Request a password reset link for your New Creation Kids account."
  }),
  title: {
    absolute: "Reset password"
  }
};

export default function MissingPasswordPage() {
  return (
    <>
      <LoginPageTitle />
      <SiteHeader />
      <main className="site-shell section">
        <MissingPasswordForm />
      </main>
    </>
  );
}
