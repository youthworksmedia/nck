"use client";

import type { Route } from "next";
import Link from "next/link";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  AdminLessonResourceFields,
  attachmentsToDrafts,
  emptyResourceDrafts,
  type LessonResourceDraft
} from "@/components/admin-lesson-resource-fields";
import { WysiwygEditor, type WysiwygEditorHandle } from "@/components/wysiwyg-editor";
import {
  curriculumSections,
  curriculumYears,
  normalizeCurriculumSection,
  normalizeCurriculumYear,
  type CurriculumSection,
  type CurriculumYear
} from "@/lib/curriculum";
import type { ResourceLibraryFile } from "@/lib/resource-assets";
import type { LessonPodcastLink, Resource } from "@/types";

type Props = {
  resource: Resource;
  files: ResourceLibraryFile[];
  basePath?: "/admin" | "/content";
};

function getPreschoolDrafts(resource: Resource) {
  if (resource.preschoolAttachments?.length) {
    return attachmentsToDrafts(resource.preschoolAttachments);
  }

  if (resource.lessonNumber === 1 && resource.attachments?.length) {
    return attachmentsToDrafts(resource.attachments);
  }

  return emptyResourceDrafts();
}

function buildContentHref(
  basePath: "/admin" | "/content",
  params: {
    year?: string;
    term?: string;
  }
) {
  const searchParams = new URLSearchParams();

  if (basePath === "/admin") {
    searchParams.set("section", "content");
  }

  if (params.year) {
    searchParams.set("year", params.year);
  }

  if (params.term) {
    searchParams.set("term", params.term);
  }

  const query = searchParams.toString();
  return (query ? `${basePath}?${query}` : basePath) as Route;
}

export function AdminResourceEditForm({ resource, files, basePath = "/admin" }: Props) {
  const router = useRouter();
  const descriptionEditorRef = useRef<WysiwygEditorHandle | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: resource.title,
    description: resource.description,
    scripture: resource.scripture ?? "",
    bigIdea: resource.bigIdea ?? "Big Idea coming soon.",
    podcastTitle: resource.podcastTitle ?? "",
    podcastLinks: resource.podcastLinks ?? ([] as LessonPodcastLink[]),
    yearCycle: normalizeCurriculumYear(resource.yearCycle),
    term: normalizeCurriculumSection(resource.term),
    publishDate: resource.publishDate ?? "",
    expiryDate: resource.expiryDate ?? "",
    status: resource.status ?? ("open" as "open" | "closed"),
    schoolAgeFiles: resource.attachments?.length
      ? attachmentsToDrafts(resource.attachments)
      : (emptyResourceDrafts() as LessonResourceDraft[]),
    preschoolFiles: getPreschoolDrafts(resource)
  });

  function submitDraft(closeAfterSave: boolean) {
    const latestDescription = descriptionEditorRef.current?.getHtml() ?? draft.description;
    setDraft((current) => ({ ...current, description: latestDescription }));
    setMessage(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", draft.title);
      formData.set("description", latestDescription);
      formData.set("scripture", draft.scripture);
      formData.set("bigIdea", draft.bigIdea);
      formData.set("podcastTitle", draft.podcastTitle);
      formData.set("yearCycle", draft.yearCycle);
      formData.set("term", draft.term);
      formData.set("publishDate", draft.publishDate);
      formData.set("expiryDate", draft.expiryDate);
      formData.set("status", draft.status);
      formData.set(
        "schoolAgeResourceFiles",
        JSON.stringify(
          draft.schoolAgeFiles.map(({ file: _file, ...entry }) => ({
            ...entry,
            name: entry.name.trim() || entry.fileName || "Resource"
          }))
        )
      );
      formData.set(
        "preschoolResourceFiles",
        JSON.stringify(
          draft.preschoolFiles.map(({ file: _file, ...entry }) => ({
            ...entry,
            name: entry.name.trim() || entry.fileName || "Resource"
          }))
        )
      );
      formData.set("podcastLinks", JSON.stringify(draft.podcastLinks));
      [...draft.schoolAgeFiles, ...draft.preschoolFiles].forEach((entry) => {
        if (entry.file) {
          formData.set(`resourceFile-${entry.id}`, entry.file);
        }
      });

      const response = await fetch(`/api/admin/resources/${resource.id}`, {
        method: "PATCH",
        body: formData
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.message ?? "Unable to save this lesson.");
        return;
      }

      if (closeAfterSave) {
        router.push(buildContentHref(basePath, { year: draft.yearCycle, term: draft.term }));
        router.refresh();
        return;
      }

      setMessage(payload?.message ?? "Lesson saved.");
      router.refresh();
    });
  }

  const backHref = buildContentHref(basePath, { year: draft.yearCycle, term: draft.term });

  return (
    <div className="invite-form">
      <div className="admin-title-row">
        <label className="admin-field-label" htmlFor={`resource-title-${resource.id}`}>
          Title *
        </label>
        <input
          id={`resource-title-${resource.id}`}
          type="text"
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          required
        />
      </div>
      <div className="three-up admin-form-grid">
        <div>
          <label className="admin-field-label" htmlFor={`resource-scripture-${resource.id}`}>
            Scripture *
          </label>
          <input
            id={`resource-scripture-${resource.id}`}
            type="text"
            value={draft.scripture}
            onChange={(event) => setDraft((current) => ({ ...current, scripture: event.target.value }))}
          />
        </div>
        <div>
          <label className="admin-field-label" htmlFor={`resource-big-idea-${resource.id}`}>
            Big Idea *
          </label>
          <input
            id={`resource-big-idea-${resource.id}`}
            type="text"
            value={draft.bigIdea}
            onChange={(event) => setDraft((current) => ({ ...current, bigIdea: event.target.value }))}
          />
        </div>
        <div>
          <label className="admin-field-label" htmlFor={`resource-year-${resource.id}`}>
            Year *
          </label>
          <select
            id={`resource-year-${resource.id}`}
            value={draft.yearCycle}
            onChange={(event) =>
              setDraft((current) => ({ ...current, yearCycle: event.target.value as CurriculumYear }))
            }
          >
            {curriculumYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-field-label" htmlFor={`resource-term-${resource.id}`}>
            Term *
          </label>
          <select
            id={`resource-term-${resource.id}`}
            value={draft.term}
            onChange={(event) =>
              setDraft((current) => ({ ...current, term: event.target.value as CurriculumSection }))
            }
          >
            {curriculumSections.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="three-up admin-form-grid">
        <div>
          <label className="admin-field-label" htmlFor={`resource-publish-${resource.id}`}>
            Publish date *
          </label>
          <input
            id={`resource-publish-${resource.id}`}
            type="date"
            value={draft.publishDate}
            onChange={(event) => setDraft((current) => ({ ...current, publishDate: event.target.value }))}
          />
        </div>
        <div>
          <label className="admin-field-label" htmlFor={`resource-expiry-${resource.id}`}>
            Expiry date
          </label>
          <input
            id={`resource-expiry-${resource.id}`}
            type="date"
            value={draft.expiryDate}
            onChange={(event) => setDraft((current) => ({ ...current, expiryDate: event.target.value }))}
          />
        </div>
        <div>
          <label className="admin-field-label" htmlFor={`resource-status-${resource.id}`}>
            Status *
          </label>
          <select
            id={`resource-status-${resource.id}`}
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as "open" | "closed" }))}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <section className="admin-resource-files-editor admin-resource-metadata-editor">
        <div className="admin-resource-files-head">
          <div>
            <h3>Lesson extras</h3>
            <p>Update the Big Idea above, then add or edit any podcast links here.</p>
          </div>
        </div>
        <PodcastFields
          podcastTitle={draft.podcastTitle}
          podcastLinks={draft.podcastLinks}
          onPodcastTitleChange={(podcastTitle) => setDraft((current) => ({ ...current, podcastTitle }))}
          onPodcastLinksChange={(podcastLinks) => setDraft((current) => ({ ...current, podcastLinks }))}
        />
      </section>
      <AdminLessonResourceFields
        value={draft.schoolAgeFiles}
        files={files}
        onChange={(schoolAgeFiles) => setDraft((current) => ({ ...current, schoolAgeFiles }))}
        program="schoolAge"
        title="School Age Program downloads"
        description="Add the subscriber-only lesson files for the School Age Program."
        addLabel="Add school age file"
      />
      <AdminLessonResourceFields
        value={draft.preschoolFiles}
        files={files}
        onChange={(preschoolFiles) => setDraft((current) => ({ ...current, preschoolFiles }))}
        program="preschool"
        title="Preschool Program downloads"
        description="Add the subscriber-only lesson files for the Preschool Program."
        addLabel="Add preschool file"
      />
      <WysiwygEditor
        ref={descriptionEditorRef}
        label="Content *"
        value={draft.description}
        onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
        placeholder="Write the lesson content here."
      />
      <div className="button-row button-row-tight">
        <button
          type="button"
          className="button button-primary"
          disabled={isPending}
          onClick={() => submitDraft(false)}
        >
          <Save size={16} />
          <span>{isPending ? "Saving..." : "Save"}</span>
        </button>
        <button
          type="button"
          className="button"
          disabled={isPending}
          onClick={() => submitDraft(true)}
        >
          <Save size={16} />
          <span>{isPending ? "Saving..." : "Save and close"}</span>
        </button>
        <Link href={backHref} className="button button-secondary">
          Cancel
        </Link>
      </div>
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}

function PodcastFields({
  podcastTitle,
  podcastLinks,
  onPodcastTitleChange,
  onPodcastLinksChange
}: {
  podcastTitle: string;
  podcastLinks: LessonPodcastLink[];
  onPodcastTitleChange: (value: string) => void;
  onPodcastLinksChange: (value: LessonPodcastLink[]) => void;
}) {
  return (
    <section className="admin-resource-files-editor admin-resource-subsection">
      <div className="admin-resource-files-head">
        <div>
          <h3>Podcast</h3>
          <p>Add an optional podcast title and the places people can find it.</p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            onPodcastLinksChange([
              ...podcastLinks,
              { id: crypto.randomUUID(), label: "", url: "" }
            ])
          }
        >
          Add link
        </button>
      </div>
      <div className="admin-title-row">
        <label className="admin-field-label" htmlFor="podcast-title-edit">
          Podcast name
        </label>
        <input
          id="podcast-title-edit"
          type="text"
          value={podcastTitle}
          onChange={(event) => onPodcastTitleChange(event.target.value)}
          placeholder="Jesus is rejected in Nazareth - Episode 1"
        />
      </div>
      <div className="admin-resource-file-list">
        {podcastLinks.map((link) => (
          <div key={link.id} className="admin-resource-file-row admin-podcast-row">
            <div>
              <label className="admin-field-label" htmlFor={`podcast-link-label-${link.id}`}>
                Where to find it
              </label>
              <input
                id={`podcast-link-label-${link.id}`}
                type="text"
                value={link.label}
                onChange={(event) =>
                  onPodcastLinksChange(
                    podcastLinks.map((entry) =>
                      entry.id === link.id ? { ...entry, label: event.target.value } : entry
                    )
                  )
                }
                placeholder="Spotify"
              />
            </div>
            <div>
              <label className="admin-field-label" htmlFor={`podcast-link-url-${link.id}`}>
                URL
              </label>
              <input
                id={`podcast-link-url-${link.id}`}
                type="url"
                value={link.url}
                onChange={(event) =>
                  onPodcastLinksChange(
                    podcastLinks.map((entry) =>
                      entry.id === link.id ? { ...entry, url: event.target.value } : entry
                    )
                  )
                }
                placeholder="https://..."
              />
            </div>
            <button
              type="button"
              className="button button-secondary admin-resource-file-remove"
              onClick={() => onPodcastLinksChange(podcastLinks.filter((entry) => entry.id !== link.id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
