"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { hasSupabaseEnv, publicEnv } from "@/lib/public-env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function MissingPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="panel login-panel"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");

        startTransition(async () => {
          if (!hasSupabaseEnv) {
            setMessage("Add Supabase environment variables to enable password reset emails.");
            return;
          }

          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`
          });

          if (error) {
            setMessage(error.message);
            return;
          }

          setMessage("If this email is registered, a password reset link has been sent.");
        });
      }}
    >
      <div className="login-head">
        <h1>Reset password</h1>
        <p>Enter your account email and we will send a link to create a new password.</p>
      </div>
      <div className="login-fields">
        <label htmlFor="reset-email">Email address</label>
        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <button type="submit" className="button button-primary login-submit-button" disabled={isPending}>
        <Mail size={16} />
        <span>{isPending ? "Sending..." : "Send reset link"}</span>
      </button>
      <Link href="/login" className="login-forgot-link">
        Back to login
      </Link>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
