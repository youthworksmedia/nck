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
    <>
      <LoginPageTitle />
      <SiteHeader />
      <main className="site-shell section">
        <LoginForm />
      </main>
    </>
  );
}
