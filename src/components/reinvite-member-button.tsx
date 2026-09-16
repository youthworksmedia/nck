"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ReinviteMemberButtonProps = {
  memberId: string;
  email: string;
};

export function ReinviteMemberButton({ memberId, email }: ReinviteMemberButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="member-action">
      <button
        type="button"
        className="icon-button"
        disabled={isPending}
        aria-label={`Reinvite ${email}`}
        title={`Reinvite ${email}`}
        onClick={() => {
          setMessage(null);

          startTransition(async () => {
            const response = await fetch(`/api/team-members/${memberId}/reinvite`, {
              method: "POST"
            });
            const payload = await response.json();

            if (!response.ok) {
              setMessage(payload.message ?? "Unable to resend invite.");
              return;
            }

            setMessage(payload.message ?? "Invite resent.");
            router.refresh();
          });
        }}
      >
        <RefreshCw size={16} />
      </button>
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
