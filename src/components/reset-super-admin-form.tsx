"use client";

import { useState, useTransition } from "react";

type ResetResult = {
  ok?: boolean;
  message?: string;
  email?: string;
  password?: string;
};

export function ResetSuperAdminForm() {
  const [result, setResult] = useState<ResetResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        setResult(null);

        startTransition(async () => {
          const response = await fetch("/api/admin/reset-super-admin", {
            method: "POST"
          });
          const payload = (await response.json()) as ResetResult;
          setResult(payload);
        });
      }}
    >
      <div>
        <span className="eyebrow">Admin repair</span>
        <h1>Reset super admin password</h1>
        <p>
          This local repair tool resets the `robert.moller@youthworks.net` super admin
          account and makes sure it has the `super_admin` role.
        </p>
      </div>
      <button type="submit" className="button button-primary" disabled={isPending}>
        {isPending ? "Resetting..." : "Reset super admin"}
      </button>
      {result?.message ? <p className="form-status">{result.message}</p> : null}
      {result?.ok ? (
        <p className="form-status">
          Email: {result.email}
          <br />
          Password: {result.password}
        </p>
      ) : null}
    </form>
  );
}
