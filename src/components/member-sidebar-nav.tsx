"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CreditCard, FileText, Home, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

import {
  curriculumYears,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";

type Props = {
  isSuperAdmin: boolean;
  isOwner: boolean;
  className?: string;
  onNavigate?: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/account") {
    return pathname === "/account";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberSidebarNav({ isSuperAdmin, isOwner, className = "", onNavigate }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isResourcesPage = pathname.startsWith("/resources");
  const isFamilyPage = pathname.startsWith("/family");
  const isLeadersPage = pathname.startsWith("/leaders");
  const activeYear = normalizeCurriculumYear(searchParams.get("year"));
  const activeSection = normalizeCurriculumSection(searchParams.get("section") ?? searchParams.get("term"));

  const linkClass = (href: string, extraClass = "") =>
    `member-sidebar-link ${extraClass} ${isActive(pathname, href) ? "member-sidebar-link-active" : ""}`.trim();

  return (
    <nav className={`member-sidebar-nav ${className}`.trim()}>
      <div className="member-sidebar-group">
        <span className="member-sidebar-label">Platform</span>
        <Link href="/account" className={linkClass("/account")} onClick={onNavigate}>
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </Link>
      </div>

      <div className="member-sidebar-group">
        <span className="member-sidebar-label">Content</span>
        <Link href="/resources" className={linkClass("/resources", "member-sidebar-link-teach")} onClick={onNavigate}>
          <Home size={16} />
          <span>Teach</span>
        </Link>
        {isResourcesPage ? (
          <div className="member-sidebar-lessons" aria-label="Lesson menu">
            {curriculumYears.map((year) => (
              <Link
                key={year}
                href={{ pathname: "/resources", query: { year, section: activeYear === year ? activeSection : "Unit 1" } }}
                aria-current={activeYear === year ? "page" : undefined}
                className={`member-sidebar-lesson-year-link ${
                  activeYear === year ? "member-sidebar-lesson-year-link-active" : ""
                }`}
                onClick={onNavigate}
              >
                {year}
              </Link>
            ))}
          </div>
        ) : null}
        <Link href={"/leaders" as Route} className={linkClass("/leaders", "member-sidebar-link-leaders")} onClick={onNavigate}>
          <Home size={16} />
          <span>Leaders</span>
        </Link>
        {isLeadersPage ? (
          <div className="member-sidebar-lessons" aria-label="Leader resources menu">
            <Link
              href={"/leaders/photos" as Route}
              aria-current={isActive(pathname, "/leaders/photos") ? "page" : undefined}
              className={`member-sidebar-lesson-year-link ${
                isActive(pathname, "/leaders/photos") ? "member-sidebar-lesson-year-link-active" : ""
              }`}
              onClick={onNavigate}
            >
              <span>Images</span>
            </Link>
            <Link
              href={"/leaders/games" as Route}
              aria-current={isActive(pathname, "/leaders/games") ? "page" : undefined}
              className={`member-sidebar-lesson-year-link ${
                isActive(pathname, "/leaders/games") ? "member-sidebar-lesson-year-link-active" : ""
              }`}
              onClick={onNavigate}
            >
              <span>Games</span>
            </Link>
          </div>
        ) : null}
        <Link href={"/family" as Route} className={linkClass("/family", "member-sidebar-link-family")} onClick={onNavigate}>
          <Home size={16} />
          <span>Family</span>
        </Link>
        {isFamilyPage ? (
          <div className="member-sidebar-lessons" aria-label="Family resources menu">
            {curriculumYears.map((year) => (
              <Link
                key={year}
                href={{ pathname: "/family", query: { year, section: activeYear === year ? activeSection : "Unit 1" } }}
                aria-current={activeYear === year ? "page" : undefined}
                className={`member-sidebar-lesson-year-link ${
                  activeYear === year ? "member-sidebar-lesson-year-link-active" : ""
                }`}
                onClick={onNavigate}
              >
                {year}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {isOwner || isSuperAdmin ? (
        <div className="member-sidebar-group">
          <span className="member-sidebar-label">Account holder</span>
          <Link href="/account/team" className={linkClass("/account/team", "member-sidebar-link-team")} onClick={onNavigate}>
            <Users size={16} />
            <span>Team</span>
          </Link>
          <Link
            href={"/account/resources" as Route}
            className={linkClass("/account/resources", "member-sidebar-link-resources")}
            onClick={onNavigate}
          >
            <FileText size={16} />
            <span>Resources</span>
          </Link>
          <Link
            href="/account/subscription"
            className={linkClass("/account/subscription", "member-sidebar-link-billing")}
            onClick={onNavigate}
          >
            <CreditCard size={16} />
            <span>Account</span>
          </Link>
          {isSuperAdmin ? (
            <Link href="/admin" className={linkClass("/admin", "member-sidebar-link-admin")} onClick={onNavigate}>
              <ShieldCheck size={16} />
              <span>Admin Console</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
