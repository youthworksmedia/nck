"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, Eye, HelpCircle, Menu, X } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { MemberSidebarNav } from "@/components/member-sidebar-nav";

type Props = {
  hasActiveAccount: boolean;
  churchLabel: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  planTier?: string;
  renewalDate?: string;
  isSuperAdmin: boolean;
  userName?: string;
  userRoleLabel?: string;
};

export function MemberMobileMenu({
  hasActiveAccount,
  churchLabel,
  isLoggedIn,
  isOwner,
  renewalDate,
  isSuperAdmin,
  userName,
  userRoleLabel
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className="member-mobile-menu">
      <Link href="/" className="member-mobile-menu-logo" aria-label="New Creation Kids homepage">
        <Image
          src="/nck-logo-horiz.svg"
          alt="New Creation Kids"
          width={226}
          height={61}
          className="member-mobile-menu-logo-image"
          priority
        />
      </Link>
      <button
        type="button"
        className="member-mobile-menu-toggle"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {isOpen ? (
        <div className="member-mobile-menu-layer" onClick={() => setIsOpen(false)}>
          <div
            className="member-mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Member navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="member-mobile-menu-brand">
              <strong>
                {churchLabel}
                {isLoggedIn && hasActiveAccount ? <span className="member-account-active-dot" aria-label="Active account" /> : null}
              </strong>
              {isLoggedIn && !hasActiveAccount ? (
                <span className="member-account-expired">
                  Subscription expired ({renewalDate ?? "-"})
                  {isOwner ? (
                    <>
                      , please{" "}
                      <Link href={"/account/subscription" as Route} onClick={() => setIsOpen(false)}>
                        renew
                      </Link>
                    </>
                  ) : null}
                </span>
              ) : null}
              <small>Menu</small>
            </div>

            <MemberSidebarNav
              isSuperAdmin={isSuperAdmin}
              isOwner={isOwner}
              className="member-mobile-menu-nav"
              onNavigate={() => setIsOpen(false)}
            />

            <div className="member-mobile-menu-bottom">
              {isLoggedIn ? (
                <>
                  <Link href={"/help" as Route} className="member-sidebar-help-link" onClick={() => setIsOpen(false)}>
                    <HelpCircle size={18} />
                    <span>Help &amp; FAQs</span>
                  </Link>

                  <div className="member-sidebar-footer member-mobile-menu-footer">
                    <span className="member-avatar">{getInitials(userName)}</span>
                    <span className="member-sidebar-user">
                      <strong>{userName}</strong>
                      <small>{userRoleLabel}</small>
                    </span>
                    <LogoutButton />
                  </div>
                </>
              ) : (
                <div className="member-mobile-menu-guest-actions">
                  <Link href="/#subscription-plans" className="member-mobile-menu-guest-link" onClick={() => setIsOpen(false)}>
                    <CreditCard size={16} />
                    <span>Subscribe</span>
                  </Link>
                  <Link href="/resources" className="member-mobile-menu-guest-link" onClick={() => setIsOpen(false)}>
                    <Eye size={16} />
                    <span>Preview</span>
                  </Link>
                  <Link href="/login" className="member-mobile-menu-guest-link" onClick={() => setIsOpen(false)}>
                    <span>Login</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getInitials(name?: string | null) {
  if (!name) {
    return "NK";
  }

  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "NK"
  );
}
