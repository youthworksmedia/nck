import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";
import { LoginPageTitle } from "@/components/login-page-title";
import { SiteHeader } from "@/components/site-header";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata({
    title: "Login",
    description: "Log in to your New Creation Kids account."
  }),
  title: {
    absolute: "Login"
  }
};

export default function LoginPage() {
  return (
    <div className="promo-login-layout">
      <LoginPageTitle />
      <SiteHeader />
      <main className="promo-login-shell">
        <section className="promo-login-copy">
          <p className="promo-eyebrow">Welcome back</p>
          <h1>Login to New Creation Kids</h1>
          <p>
            Access your curriculum, downloads, leader resources, and account tools in one calm place.
          </p>
        </section>
        <LoginForm />
      </main>
    </div>
  );
}
