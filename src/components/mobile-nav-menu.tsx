"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { LayoutDashboard } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";

type NavItem = {
  href: Route;
  label: string;
};

type Props = {
  items: readonly NavItem[];
  isLoggedIn: boolean;
};

export function MobileNavMenu({ items, isLoggedIn }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label="Open menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      {isOpen ? (
        <div className="mobile-nav-layer" onClick={() => setIsOpen(false)}>
          <div className="mobile-nav-panel" onClick={(event) => event.stopPropagation()}>
            <nav className="mobile-nav-links" aria-label="Mobile primary">
              {items.map((item) => (
                <Link
                  key={`mobile-${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/account" className="mobile-dashboard-link" onClick={() => setIsOpen(false)}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              {isLoggedIn ? <LogoutButton /> : <Link href="/login" onClick={() => setIsOpen(false)}>Login</Link>}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
