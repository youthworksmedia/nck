"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/password-input";
import { passwordRequirementText } from "@/lib/password";

export function InviteTeamForm({
  remainingAdditionalTeamMembers
}: {
  remainingAdditionalTeamMembers: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          setName("");
          setEmail("");
          setPassword("");
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
                <h3 id="invite-team-member-modal">Add team member</h3>
                <p>Invite as many team members as your ministry needs.</p>
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
                    body: JSON.stringify({ name, email, password })
                  });

                  const payload = await response.json();
                  setStatus(payload.message);

                  if (response.ok) {
                    setName("");
                    setEmail("");
                    setPassword("");
                    setIsOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              <input
                id="invite-name"
                type="text"
                className="invite-name-input"
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <input
                id="invite-email"
                type="email"
                className="invite-email-input"
                placeholder="email@address.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <PasswordInput
                id="invite-password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                minLength={8}
                required
              />
              <p className="form-status form-status-small">
                {passwordRequirementText}
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary" type="submit" disabled={isPending}>
                  {isPending ? "Adding..." : "Add team member"}
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
