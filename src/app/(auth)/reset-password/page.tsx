import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginPageTitle } from "@/components/login-page-title";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { SiteHeader } from "@/components/site-header";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata({
    title: "Reset password",
    description: "Reset the password for your New Creation Kids account."
  }),
  title: {
    absolute: "Reset password"
  }
};

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const invite = Array.isArray(params.invite) ? params.invite[0] : params.invite;

  if (type === "invite" || invite === "1") {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          query.append(key, item);
        }
        continue;
      }

      if (value) {
        query.set(key, value);
      }
    }

    redirect(`/create-account${query.size > 0 ? `?${query.toString()}` : ""}` as Route);
  }

  return (
    <div className="promo-login-layout">
      <LoginPageTitle />
      <SiteHeader />
      <main className="promo-login-shell">
        <section className="promo-login-copy">
          <p className="promo-eyebrow">Account help</p>
          <h1>Reset your password</h1>
          <p>
            Use your secure recovery link to choose a fresh password and return to your curriculum tools.
          </p>
        </section>
        <Suspense fallback={null}>
          <ResetPasswordForm mode="recovery" />
        </Suspense>
      </main>
    </div>
  );
}
