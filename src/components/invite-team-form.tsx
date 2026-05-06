"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function InviteTeamForm({
  remainingAdditionalTeamMembers
}: {
  remainingAdditionalTeamMembers: number;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="button button-primary account-team-launch-button"
        onClick={() => {
          setStatus(null);
          setEmail("");
          setIsOpen(true);
        }}
      >
        <Plus size={16} />
        Add team member
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className="modal-card account-team-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-team-member-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="invite-team-member-modal">Invite team member</h3>
                <p>Enter an email address and we will send an invitation link.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Close add team member window"
              >
                <X size={16} />
              </button>
            </div>

            <form
              className="invite-form"
              onSubmit={(event) => {
                event.preventDefault();
                setStatus(null);

                startTransition(async () => {
                  const response = await fetch("/api/invite", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email })
                  });

                  const payload = await response.json();
                  setStatus(payload.message);

                  if (response.ok) {
                    setEmail("");
                    setIsOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              <input
                id="invite-email"
                type="email"
                className="invite-email-input"
                placeholder="email@address.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <div className="button-row">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary" type="submit" disabled={isPending}>
                  {isPending ? "Sending..." : "Send invite"}
                </button>
              </div>
              {status ? <p className="form-status">{status}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
