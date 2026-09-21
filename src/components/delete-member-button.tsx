"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteMemberButtonProps = {
  memberId: string;
  email: string;
  disabled?: boolean;
};

export function DeleteMemberButton({
  memberId,
  email,
  disabled = false
}: DeleteMemberButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="member-action">
      <button
        type="button"
        className="icon-button"
        disabled={disabled || isPending}
        aria-label={disabled ? "You cannot delete your own account" : `Delete ${email}`}
        title={disabled ? "You cannot delete your own account" : `Delete ${email}`}
        onClick={() => {
          if (disabled) {
            return;
          }

          const confirmed = window.confirm(
            `Delete ${email}? They will lose team access immediately, and their sign-in account will be removed if it is not used anywhere else.`
          );

          if (!confirmed) {
            return;
          }

          setMessage(null);

          startTransition(async () => {
            const response = await fetch(`/api/team-members/${memberId}`, {
              method: "DELETE"
            });

            const payload = await response.json();

            if (!response.ok) {
              setMessage(payload.message ?? "Unable to delete member.");
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
