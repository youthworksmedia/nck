"use client";

import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SuperAdminNameFormProps = {
  userId: string;
  email: string;
  initialName: string;
};

export function SuperAdminNameForm({
  userId,
  email,
  initialName
}: SuperAdminNameFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label={`Edit name for ${email}`}
        title={`Edit name for ${email}`}
        onClick={() => {
          setMessage(null);
          setName(initialName);
          setIsOpen(true);
        }}
      >
        <Pencil size={16} />
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`admin-name-modal-${userId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id={`admin-name-modal-${userId}`}>Edit super admin name</h3>
                <p>{email}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Close name window"
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
                  const response = await fetch(`/api/admin/super-admins/${userId}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ name })
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
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
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
                <button type="submit" className="button button-primary" disabled={isPending}>
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
              {message ? <p className="form-status">{message}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
