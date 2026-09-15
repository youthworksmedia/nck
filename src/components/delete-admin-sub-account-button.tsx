"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteAdminSubAccountButtonProps = {
  organizationId: string;
  memberId: string;
  email: string;
};

export function DeleteAdminSubAccountButton({
  organizationId,
  memberId,
  email
}: DeleteAdminSubAccountButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="member-action">
      <button
        type="button"
        className="icon-button"
        disabled={isPending}
        aria-label={`Delete sub account ${email}`}
        title={`Delete sub account ${email}`}
        onClick={() => {
          const confirmed = window.confirm(
            `Delete the sub account for ${email}? They will lose access to this account immediately.`
          );

          if (!confirmed) {
            return;
          }

          setMessage(null);

          startTransition(async () => {
            const response = await fetch(`/api/admin/accounts/${organizationId}/members/${memberId}`, {
              method: "DELETE"
            });

            const payload = await response.json();

            if (!response.ok) {
              setMessage(payload.message ?? "Unable to delete sub account.");
              return;
            }

            router.refresh();
          });
        }}
      >
        <Trash2 size={16} />
      </button>
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
