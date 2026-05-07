import Link from "next/link";
import Image from "next/image";
import { Settings, ShieldCheck } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getCurrentOrganizationMembership } from "@/lib/portal";

export async function MemberShell({ children }: { children: React.ReactNode }) {
  const [{ user, membership }, isSuperAdmin] = await Promise.all([
    getCurrentOrganizationMembership(),
    isCurrentUserSuperAdmin()
  ]);
  const userFullName =
    user && "user_metadata" in user && typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const displayName =
    membership?.role === "owner"
      ? membership.display_name ||
        userFullName ||
        user?.email ||
        "Account holder"
      : user?.email ?? "Team member";

  return (
    <div className="member-shell">
      <div className="member-workspace">
        <header className="member-topbar">
          <div className="member-topbar-identity">
            <Link href="/account" className="member-topbar-logo" aria-label="New Creation Kids dashboard">
              <Image src="/pdf-logo.png" alt="" width={44} height={44} priority />
            </Link>
            <div>
              <span className="member-topbar-kicker">Signed in</span>
              <strong>{displayName}</strong>
            </div>
          </div>
          <div className="member-topbar-actions">
            {isSuperAdmin ? (
              <Link href="/admin" className="member-icon-link" aria-label="Admin">
                <ShieldCheck size={18} />
              </Link>
            ) : null}
            <Link href="/account" className="member-icon-link" aria-label="Account settings">
              <Settings size={18} />
            </Link>
            <LogoutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
