"use client";

import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { passwordRequirementText } from "@/lib/password";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="invite-form"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const response = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ password })
          });

          const payload = await response.json();
          setMessage(payload.message);

          if (response.ok) {
            setPassword("");
          }
        });
      }}
    >
      <label htmlFor="account-password" className="form-heading">
        Update your password
      </label>
      <div className="inline-form">
        <PasswordInput
          id="account-password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          minLength={8}
          required
        />
        <button type="submit" className="button button-secondary" disabled={isPending}>
          {isPending ? "Updating..." : "Save password"}
        </button>
      </div>
      <p className="form-status form-status-small">{passwordRequirementText}</p>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
