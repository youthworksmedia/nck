import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Gamepad2, Home, Image as ImageIcon, Link as LinkIcon, Play, Plus } from "lucide-react";

import { getPublishedLeaderResources } from "@/lib/leader-resources";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getMemberAccessSnapshot } from "@/lib/portal";
import type { LeaderResourceItem } from "@/types";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Leader Resources",
  description: "Training videos, guides, and tools to help your team teach with confidence."
});

function LeaderResourceIcon({ item }: { item: LeaderResourceItem }) {
  if (item.url === "/leaders/photos" || item.title.trim().toLowerCase() === "image library") {
    return <ImageIcon size={22} />;
  }

  if (item.resourceType === "video") {
    return <Play size={22} fill="currentColor" />;
  }

  if (item.resourceType === "tool") {
    return <Gamepad2 size={22} />;
  }

  if (item.resourceType === "link") {
    return <LinkIcon size={20} />;
  }

  if (item.resourceType === "coming_soon") {
    return <Plus size={18} />;
  }

  return <FileText size={20} />;
}

function itemHref(item: LeaderResourceItem) {
  if (item.resourceType === "coming_soon") return null;
  if (item.url) return item.url;
  if (item.filePath) return `/api/leaders/resources/${item.id}/download`;

  return null;
}

function actionLabel(item: LeaderResourceItem) {
  if (item.resourceType === "coming_soon") return "Soon";
  if (item.resourceType === "video") return "Watch";
  if (item.resourceType === "tool") return "Open";
  if (item.resourceType === "link") return "Open";
  if (item.resourceType === "pdf") return "PDF";

  return "Guide";
}

function itemKicker(item: LeaderResourceItem) {
  const label = actionLabel(item);
  return item.duration ? `${label} · ${item.duration}` : label;
}

function isGamesLibraryItem(item: LeaderResourceItem) {
  return item.url === "/leaders/games" || item.title.trim().toLowerCase() === "games library";
}

function isImageLibraryItem(item: LeaderResourceItem) {
  return item.url === "/leaders/photos" || item.title.trim().toLowerCase() === "image library";
}

export default async function LeadersPage() {
  const [access, sections] = await Promise.all([
    getMemberAccessSnapshot(),
    getPublishedLeaderResources()
  ]);

  if (!access.user) {
    redirect("/login");
  }

  if (!access.hasActiveAccount) {
    redirect("/account");
  }

  return (
    <main className="site-shell section account-page leaders-page">
      <section className="leaders-page-head">
        <span className="eyebrow">
          <Home size={18} />
          Leaders
        </span>
        <h1>Leader Resources</h1>
        <p>
          Training videos, guides, and tools to help your team teach with confidence.
          More resources will be added over time.
        </p>
      </section>

      <div className="leaders-section-stack">
        {sections.map((section) => {
          const isToolSection = section.title.trim().toLowerCase() === "tools";

          return (
            <section className="leaders-resource-section" key={section.id}>
              {!isToolSection ? (
                <div className="leaders-resource-section-head">
                  <h2>{section.title}</h2>
                  {section.description ? <p>{section.description}</p> : null}
                </div>
              ) : null}
              <div className="leaders-resource-grid">
                {section.items.map((item) => {
                  const href = itemHref(item);
                  const isComingSoon = item.resourceType === "coming_soon";
                  const isToolItem = isToolSection && (isGamesLibraryItem(item) || isImageLibraryItem(item));
                  const kicker = itemKicker(item);

                  const toolContent = (
                    <>
                      <span className="leaders-tool-icon">
                        <LeaderResourceIcon item={item} />
                      </span>
                      <span className="leaders-tool-copy">
                        <strong>{item.title}</strong>
                        {item.description ? <small>{item.description}</small> : null}
                      </span>
                      {!isComingSoon ? (
                        <span className="leaders-tool-action">
                          <ArrowRight size={18} />
                        </span>
                      ) : null}
                    </>
                  );

                  if (isToolItem) {
                    if (!href) {
                      return (
                        <div className="leaders-tool-row leaders-tool-row-disabled" key={item.id}>
                          {toolContent}
                        </div>
                      );
                    }

                    return (
                      <Link
                        className="leaders-tool-row"
                        href={href as Route}
                        key={item.id}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={href.startsWith("http") ? "noreferrer" : undefined}
                      >
                        {toolContent}
                      </Link>
                    );
                  }

                  const cardContent = (
                    <>
                      <span className={isComingSoon ? "leaders-coming-icon" : "leaders-video-icon"}>
                        <LeaderResourceIcon item={item} />
                      </span>
                      {kicker ? <span className="leaders-resource-kicker">{kicker}</span> : null}
                      <strong>{item.title}</strong>
                      {item.description ? <small>{item.description}</small> : null}
                    </>
                  );

                  if (!href) {
                    return (
                      <div
                        className={`leaders-resource-card ${isComingSoon ? "leaders-resource-card-muted" : ""}`}
                        key={item.id}
                      >
                        {cardContent}
                      </div>
                    );
                  }

                  return (
                    <Link
                      className={`leaders-resource-card ${isComingSoon ? "leaders-resource-card-muted" : ""}`}
                      href={href as Route}
                      key={item.id}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
          </section>
          );
        })}
      </div>

      <section className="leaders-request-banner">
        <Home size={22} />
        <div>
          <strong>Got a leader resource request?</strong>
          <p>Let us know what would help your team — we&apos;re building this out term by term.</p>
        </div>
        <Link href={"mailto:support@newcreationkids.com.au?subject=Leader%20resource%20request" as Route} className="button button-primary">
          Suggest a topic
        </Link>
      </section>
    </main>
  );
}
