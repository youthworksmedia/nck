"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { passwordRequirementText } from "@/lib/password";

export function SuperAdminForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
          const response = await fetch("/api/admin/super-admins", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
          });

          const payload = await response.json();
          setMessage(payload.message);

          if (!response.ok) {
            return;
          }

          setEmail("");
          setName("");
          setPassword("");
          router.refresh();
        });
      }}
    >
      <div className="inline-form">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          type="email"
          placeholder="email@address.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Password"
          minLength={8}
          required
        />
        <button type="submit" className="button button-primary" disabled={isPending}>
          {isPending ? "Creating..." : "Create admin"}
        </button>
      </div>
      <p className="form-status form-status-small">{passwordRequirementText}</p>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
