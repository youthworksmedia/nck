import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Paintbrush,
  Play,
  Users
} from "lucide-react";

import { buildPrivateMetadata } from "@/lib/metadata";
import { getPublishedMinistryLeaderResources } from "@/lib/ministry-leader-resources";
import { getCurrentUser, getMembershipSnapshot, isCurrentUserOwner } from "@/lib/portal";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import type { MinistryLeaderResourceItem } from "@/types";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Ministry Leader Resources",
  description: "Tools for account holders to plan, promote, and lead their ministry."
});

function ResourceIcon({ item }: { item: MinistryLeaderResourceItem }) {
  const iconKey = item.icon.toLowerCase();

  if (iconKey.includes("calendar")) return <CalendarDays size={20} />;
  if (iconKey.includes("spreadsheet") || item.resourceType === "xlsx") return <FileSpreadsheet size={20} />;
  if (iconKey.includes("play") || item.resourceType === "video") return <Play size={22} fill="currentColor" />;
  if (iconKey.includes("palette")) return <Paintbrush size={20} />;
  if (iconKey.includes("people") || iconKey.includes("user")) return <Users size={20} />;
  if (item.resourceType === "zip") return <FileArchive size={20} />;

  return <FileText size={20} />;
}

function itemHref(item: MinistryLeaderResourceItem) {
  if (item.resourceType === "coming_soon") return null;
  if (item.url) return item.url;
  if (item.filePath) return `/api/account/ministry-leader-resources/${item.id}/download`;

  return null;
}

export default async function AccountResourcesPage() {
  const [user, membership, isOwner, sections] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserOwner(),
    getPublishedMinistryLeaderResources()
  ]);

  if (!user) {
    redirect("/login");
  }

  const hasActiveMembership = ["active", "trialing"].includes(membership.subscriptionStatus);

  if (!isOwner || !hasActiveMembership) {
    const isSuperAdmin = await isCurrentUserSuperAdmin();

    if (!isSuperAdmin) {
      redirect("/account");
    }
  }

  return (
    <main className="site-shell section account-page leader-resources-page">
      <section className="leader-resources-head">
        <span className="eyebrow">Account holder · Resources</span>
        <h1>Ministry Leader Resources</h1>
        <p>
          Tools for planning your year, promoting the curriculum to your congregation,
          and leading a healthy kids&apos; ministry.
        </p>
      </section>

      <div className="leader-resource-sections">
        {sections.map((section) => (
          <section className="leader-resource-section" key={section.id}>
            <div className="leader-resource-section-head">
              <h2>{section.title}</h2>
              {section.description ? <p>{section.description}</p> : null}
            </div>
            <div className="leader-resource-list">
              {section.items.map((item) => {
                const href = itemHref(item);
                const isVideo = item.resourceType === "video";
                const action = item.actionLabel || item.resourceType.toUpperCase();
                const rowContent = (
                  <>
                    <span className={`leader-resource-icon ${isVideo ? "leader-resource-video-icon" : ""}`}>
                      <ResourceIcon item={item} />
                    </span>
                    <span className="leader-resource-copy">
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                    {item.duration ? <span className="leader-resource-duration">{item.duration}</span> : null}
                    <span className={`leader-resource-action ${item.resourceType === "coming_soon" ? "leader-resource-action-muted" : ""}`}>
                      {item.resourceType === "coming_soon" ? null : isVideo ? <Play size={14} fill="currentColor" /> : <Download size={14} />}
                      <span>{action}</span>
                    </span>
                  </>
                );

                if (!href) {
                  return (
                    <div className="leader-resource-row leader-resource-row-disabled" key={item.id}>
                      {rowContent}
                    </div>
                  );
                }

                return (
                  <Link
                    className="leader-resource-row"
                    href={href as Route}
                    key={item.id}
                    target={item.url ? "_blank" : undefined}
                    rel={item.url ? "noreferrer" : undefined}
                  >
                    {rowContent}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
