import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginPageTitle } from "@/components/login-page-title";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { SiteHeader } from "@/components/site-header";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata({
    title: "Create new account",
    description: "Create your invited New Creation Kids member account."
  }),
  title: {
    absolute: "Create new account"
  }
};

export default function CreateAccountPage() {
  return (
    <div className="promo-login-layout">
      <LoginPageTitle />
      <SiteHeader />
      <main className="promo-login-shell">
        <section className="promo-login-copy">
          <p className="promo-eyebrow">Account help</p>
          <h1>Create a new account</h1>
          <p>
            Accept your invitation, choose a password, and join your church&apos;s New Creation Kids account.
          </p>
        </section>
        <Suspense fallback={null}>
          <ResetPasswordForm mode="invite" />
        </Suspense>
      </main>
    </div>
  );
}
