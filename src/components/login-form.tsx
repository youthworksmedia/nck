"use client";

import { LogIn } from "lucide-react";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { hasSupabaseEnv } from "@/lib/public-env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="panel login-panel"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          if (!hasSupabaseEnv) {
            setMessage("Add Supabase environment variables to enable live login.");
            return;
          }

          const supabase = createSupabaseBrowserClient();

          if (!password) {
            setMessage("Enter your password to sign in.");
            return;
          }

          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            setMessage(error.message);
            return;
          }

          window.location.href = "/account";
        });
      }}
    >
      <div className="login-head">
        <h1>Login</h1>
        <p>Welcome back. Log in to your New Creation Kids account.</p>
      </div>
      <div className="login-fields">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          placeholder="Password"
          minLength={7}
          required
        />
      </div>
      <button type="submit" className="button button-primary login-submit-button" disabled={isPending}>
        <LogIn size={16} />
        <span>{isPending ? "Logging in..." : "Login"}</span>
      </button>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
