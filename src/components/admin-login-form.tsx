"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const [email, setEmail] = useState("robert.moller@youthworks.net");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            setMessage(error.message);
            return;
          }

          window.location.href = "/admin";
        });
      }}
    >
      <div>
        <span className="eyebrow">Hidden admin</span>
        <h1>Admin login</h1>
        <p>Sign in with a user account that belongs to the `super_admin` role.</p>
      </div>
      <label htmlFor="admin-email">Email address</label>
      <input
        id="admin-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <label htmlFor="admin-password">Password</label>
      <PasswordInput
        id="admin-password"
        value={password}
        onChange={setPassword}
        placeholder="Password"
        required
      />
      <Link href="/missing-password" className="login-forgot-link">
        Missing password?
      </Link>
      <button type="submit" className="button button-primary" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </button>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
