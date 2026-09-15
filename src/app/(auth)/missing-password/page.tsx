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
    <div className="promo-login-layout">
      <LoginPageTitle />
      <SiteHeader />
      <main className="promo-login-shell">
        <section className="promo-login-copy">
          <p className="promo-eyebrow">Account help</p>
          <h1>Reset your password</h1>
          <p>
            We&apos;ll send a secure reset link so you can get back into your curriculum and leader resources.
          </p>
        </section>
        <MissingPasswordForm />
      </main>
    </div>
  );
}
