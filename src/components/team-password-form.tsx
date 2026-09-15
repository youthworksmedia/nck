"use client";

import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ModalPortal } from "@/components/modal-portal";
import { PasswordInput } from "@/components/password-input";

type TeamPasswordFormProps = {
  memberId: string;
  name: string;
  email: string;
  isSelf?: boolean;
  disabled?: boolean;
};

export function TeamPasswordForm({
  memberId,
  name,
  email,
  isSelf = false,
  disabled = false
}: TeamPasswordFormProps) {
  const router = useRouter();
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="icon-button"
        disabled={disabled}
        aria-label={disabled ? "Details cannot be changed here" : `Edit ${name}`}
        title={disabled ? "Details cannot be changed here" : `Edit ${name}`}
        onClick={() => {
          if (disabled) {
            return;
          }

          setMessage(null);
          setDraftName(name);
          setDraftEmail(email);
          setPassword("");
          setIsOpen(true);
        }}
      >
        <Pencil size={16} />
      </button>

      {isOpen ? (
        <ModalPortal>
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`password-modal-${memberId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id={`password-modal-${memberId}`}>Edit team member</h3>
                <p>{name}</p>
                <p>{email}</p>
              </div>
              <button
                type="button"
              className="icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close edit window"
            >
              <X size={16} />
            </button>
            </div>

            <form
              className="invite-form"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage(null);

                startTransition(async () => {
                  const response = await fetch(`/api/team-members/${memberId}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      name: draftName,
                      email: draftEmail,
                      password
                    })
                  });

                  const payload = await response.json();
                  setMessage(payload.message);

                  if (response.ok) {
                    setIsOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              <input
                type="text"
                placeholder="Name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                minLength={2}
                disabled={isPending}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={draftEmail}
                onChange={(event) => setDraftEmail(event.target.value)}
                disabled={isPending}
                required
              />
              <PasswordInput
                placeholder="New password (optional)"
                value={password}
                onChange={setPassword}
                minLength={0}
                disabled={isPending}
              />
              <p className="form-status">Leave password blank to keep the current password.</p>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={isPending}>
                  {isPending ? "Saving..." : "Update"}
                </button>
              </div>
              {message ? <p className="form-status">{message}</p> : null}
            </form>
          </div>
        </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
