"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { hasSupabaseEnv } from "@/lib/public-env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="panel login-panel"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");

        startTransition(async () => {
          if (!hasSupabaseEnv) {
            setMessage("Add Supabase environment variables to enable password updates.");
            return;
          }

          if (!isStrongPassword(password)) {
            setMessage(passwordRequirementText);
            return;
          }

          if (password !== confirmPassword) {
            setMessage("The passwords do not match.");
            return;
          }

          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase.auth.updateUser({ password });

          if (error) {
            setMessage(error.message);
            return;
          }

          setIsComplete(true);
          setMessage("Your password has been updated. You can now log in with the new password.");
        });
      }}
    >
      <div className="login-head">
        <h1>Create new password</h1>
        <p>Choose a new password for your New Creation Kids account.</p>
      </div>
      <div className="login-fields">
        <label htmlFor="new-password">New password</label>
        <PasswordInput
          id="new-password"
          value={password}
          onChange={setPassword}
          placeholder="New password"
          minLength={8}
          required
          disabled={isComplete}
        />
        <label htmlFor="confirm-new-password">Confirm new password</label>
        <PasswordInput
          id="confirm-new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat password"
          minLength={8}
          required
          disabled={isComplete}
        />
      </div>
      <p className="form-status form-status-small">{passwordRequirementText}</p>
      <button type="submit" className="button button-primary login-submit-button" disabled={isPending || isComplete}>
        <Save size={16} />
        <span>{isPending ? "Saving..." : "Save new password"}</span>
      </button>
      {message ? <p className="form-status">{message}</p> : null}
      {isComplete ? (
        <Link href="/login" className="button button-secondary login-submit-button">
          Go to login
        </Link>
      ) : null}
    </form>
  );
}
