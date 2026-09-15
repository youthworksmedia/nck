"use client";

import { useState } from "react";
import { Power } from "lucide-react";

import { ModalPortal } from "@/components/modal-portal";

export function LogoutButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="nav-logout-button"
        onClick={() => setIsOpen(true)}
        title="Logout"
        aria-label="Logout"
      >
        <Power size={16} />
        <span className="sr-only">Logout</span>
      </button>

      {isOpen ? (
        <ModalPortal>
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className="modal-card logout-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="logout-modal-title">Logout?</h3>
                <p>This will sign you out of your account.</p>
              </div>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <a href="/auth/logout" className="button button-primary">
                Logout
              </a>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
