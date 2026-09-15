"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteSuperAdminButtonProps = {
  userId: string;
  email: string;
  disabled?: boolean;
};

export function DeleteSuperAdminButton({
  userId,
  email,
  disabled = false
}: DeleteSuperAdminButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="member-action">
      <button
        type="button"
        className="icon-button"
        disabled={disabled || isPending}
        aria-label={disabled ? "You cannot delete your own Admin account" : `Delete ${email}`}
        title={disabled ? "You cannot delete your own Admin account" : `Delete ${email}`}
        onClick={() => {
          if (disabled) {
            return;
          }

          const confirmed = window.confirm(
            `Delete the Admin account for ${email}? This removes their Admin access and deletes their login account.`
          );

          if (!confirmed) {
            return;
          }

          setMessage(null);

          startTransition(async () => {
            const response = await fetch(`/api/admin/super-admins/${userId}`, {
              method: "DELETE"
            });

            const payload = await response.json();

            if (!response.ok) {
              setMessage(payload.message ?? "Unable to delete Admin account.");
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
