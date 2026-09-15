"use client";

import type { Route } from "next";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  AdminLessonResourceFields,
  emptyResourceDrafts,
  type LessonResourceDraft
} from "@/components/admin-lesson-resource-fields";
import { WysiwygEditor, type WysiwygEditorHandle } from "@/components/wysiwyg-editor";
import {
  curriculumSections,
  curriculumYears,
  type CurriculumSection,
  type CurriculumYear
} from "@/lib/curriculum";
import type { ResourceLibraryFile } from "@/lib/resource-assets";
import { getTodayISO } from "@/lib/time";
import type { LessonPodcastLink } from "@/types";

type Props = {
  files: ResourceLibraryFile[];
  initialYearCycle: CurriculumYear;
  initialTerm: CurriculumSection;
  basePath?: "/content" | "/admin";
};

function buildContentHref(
  basePath: "/content" | "/admin",
  params: {
    tab?: "add";
    year?: string;
    term?: string;
  }
) {
  const searchParams = new URLSearchParams();

  if (basePath === "/admin") {
    searchParams.set("section", "content");
  }

  if (params.tab) {
    searchParams.set("tab", params.tab);
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

export function AdminResourceForm({ files, initialYearCycle, initialTerm, basePath = "/content" }: Props) {
  const router = useRouter();
  const today = getTodayISO();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scripture, setScripture] = useState("");
  const [bigIdea, setBigIdea] = useState("Big Idea coming soon.");
  const [podcastTitle, setPodcastTitle] = useState("");
  const [podcastLinks, setPodcastLinks] = useState<LessonPodcastLink[]>([]);
  const [yearCycle, setYearCycle] = useState<CurriculumYear>(initialYearCycle);
  const [term, setTerm] = useState<CurriculumSection>(initialTerm);
  const [publishDate, setPublishDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [schoolAgeFiles, setSchoolAgeFiles] = useState<LessonResourceDraft[]>(() => emptyResourceDrafts());
  const [preschoolFiles, setPreschoolFiles] = useState<LessonResourceDraft[]>(() => emptyResourceDrafts());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const descriptionEditorRef = useRef<WysiwygEditorHandle | null>(null);

  useEffect(() => {
    setYearCycle(initialYearCycle);
  }, [initialYearCycle]);

  useEffect(() => {
    setTerm(initialTerm);
  }, [initialTerm]);

  useEffect(() => {
    const freshToday = getTodayISO();
    setPublishDate(freshToday);
    setExpiryDate("");
    setStatus("open");
    setSchoolAgeFiles(emptyResourceDrafts());
    setPreschoolFiles(emptyResourceDrafts());
    setBigIdea("Big Idea coming soon.");
    setPodcastTitle("");
    setPodcastLinks([]);
  }, [initialYearCycle, initialTerm]);

  return (
    <form
      className="invite-form"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        const form = event.currentTarget;
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const shouldAddMore = submitter?.value === "add-more";
        const latestDescription = descriptionEditorRef.current?.getHtml() ?? description;
        setDescription(latestDescription);

        startTransition(async () => {
          const formData = new FormData();
          formData.set("title", title);
          formData.set("description", latestDescription);
          formData.set("scripture", scripture);
          formData.set("bigIdea", bigIdea);
          formData.set("podcastTitle", podcastTitle);
          formData.set("yearCycle", yearCycle);
          formData.set("term", term);
          formData.set("publishDate", publishDate);
          formData.set("expiryDate", expiryDate);
          formData.set("status", status);
          formData.set(
            "schoolAgeResourceFiles",
            JSON.stringify(
              schoolAgeFiles.map(({ file: _file, ...entry }) => ({
                ...entry,
                name: entry.name.trim() || entry.fileName || "Resource"
              }))
            )
          );
          formData.set(
            "preschoolResourceFiles",
            JSON.stringify(
              preschoolFiles.map(({ file: _file, ...entry }) => ({
                ...entry,
                name: entry.name.trim() || entry.fileName || "Resource"
              }))
            )
          );
          formData.set("podcastLinks", JSON.stringify(podcastLinks));

          [...schoolAgeFiles, ...preschoolFiles].forEach((entry) => {
            if (entry.file) {
              formData.set(`resourceFile-${entry.id}`, entry.file);
            }
          });

          const response = await fetch("/api/admin/resources", {
            method: "POST",
            body: formData
          });

          const payload = await response.json();
          setMessage(payload.message);

          if (!response.ok) {
            return;
          }

          setTitle("");
          setDescription("");
          setScripture("");
          setBigIdea("Big Idea coming soon.");
          setPodcastTitle("");
          setPodcastLinks([]);
          setYearCycle(initialYearCycle);
          setTerm(initialTerm);
          setPublishDate(today);
          setExpiryDate("");
          setStatus("open");
          setSchoolAgeFiles(emptyResourceDrafts());
          setPreschoolFiles(emptyResourceDrafts());
          form.reset();
          if (shouldAddMore) {
            router.push(buildContentHref(basePath, { tab: "add", year: yearCycle, term }));
          } else {
            router.push(buildContentHref(basePath, { year: yearCycle, term }));
          }
          router.refresh();
        });
      }}
    >
      <div className="admin-title-row">
        <label className="admin-field-label" htmlFor="resource-title">
          Title *
        </label>
        <input
          id="resource-title"
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <div className="three-up admin-form-grid">
        <div>
          <label className="admin-field-label" htmlFor="resource-scripture">
            Scripture *
          </label>
          <input
            id="resource-scripture"
            type="text"
            placeholder="John 3:16-21"
            value={scripture}
            onChange={(event) => setScripture(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="admin-field-label" htmlFor="resource-big-idea">
            Big Idea *
          </label>
          <input
            id="resource-big-idea"
            type="text"
            placeholder="Jesus came to set people free"
            value={bigIdea}
            onChange={(event) => setBigIdea(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="admin-field-label" htmlFor="resource-year-cycle">
            Year *
          </label>
          <select
            id="resource-year-cycle"
            value={yearCycle}
            onChange={(event) => setYearCycle(event.target.value as CurriculumYear)}
            required
          >
            {curriculumYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-field-label" htmlFor="resource-term">
            Term *
          </label>
          <select
            id="resource-term"
            value={term}
            onChange={(event) =>
              setTerm(event.target.value as CurriculumSection)
            }
            required
          >
            {curriculumSections.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-field-label" htmlFor="resource-publish-date">
            Publish date *
          </label>
          <input
            id="resource-publish-date"
            type="date"
            value={publishDate}
            onChange={(event) => setPublishDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="admin-field-label" htmlFor="resource-expiry-date">
            Expiry date
          </label>
          <input
            id="resource-expiry-date"
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
          />
        </div>
      </div>
      <div className="three-up admin-form-grid">
        <div>
          <label className="admin-field-label" htmlFor="resource-status">
            Status *
          </label>
          <select
            id="resource-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as "open" | "closed")}
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
            <p>Edit the Big Idea above, then optionally add a podcast title and listening links here.</p>
          </div>
        </div>
        <PodcastFields
          podcastTitle={podcastTitle}
          podcastLinks={podcastLinks}
          onPodcastTitleChange={setPodcastTitle}
          onPodcastLinksChange={setPodcastLinks}
        />
      </section>
      <AdminLessonResourceFields
        value={schoolAgeFiles}
        files={files}
        onChange={setSchoolAgeFiles}
        program="schoolAge"
        title="School Age Program downloads"
        description="Add the subscriber-only lesson files for the School Age Program."
        addLabel="Add school age file"
      />
      <AdminLessonResourceFields
        value={preschoolFiles}
        files={files}
        onChange={setPreschoolFiles}
        program="preschool"
        title="Preschool Program downloads"
        description="Add the subscriber-only lesson files for the Preschool Program."
        addLabel="Add preschool file"
      />
      <WysiwygEditor
        ref={descriptionEditorRef}
        label="Content *"
        value={description}
        onChange={setDescription}
        placeholder="Write the lesson content here."
      />
      <div className="admin-submit-row">
        <button
          type="submit"
          value="save"
          className="button button-primary admin-submit-button"
          disabled={isPending}
        >
          <Save size={16} />
          <span>{isPending ? "Saving..." : "Add lesson"}</span>
        </button>
        <button
          type="submit"
          value="add-more"
          className="button admin-submit-button"
          disabled={isPending}
        >
          <Save size={16} />
          <span>{isPending ? "Saving..." : "Save and add more"}</span>
        </button>
      </div>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
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
          <p>Add an optional podcast title and the services where people can listen.</p>
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
          <span>Add link</span>
        </button>
      </div>
      <div className="admin-title-row">
        <label className="admin-field-label" htmlFor="resource-podcast-title">
          Podcast name
        </label>
        <input
          id="resource-podcast-title"
          type="text"
          placeholder="Jesus is rejected in Nazareth - Episode 1"
          value={podcastTitle}
          onChange={(event) => onPodcastTitleChange(event.target.value)}
        />
      </div>
      <div className="admin-resource-file-list">
        {podcastLinks.map((link, index) => (
          <div key={link.id} className="admin-resource-file-row admin-podcast-row">
            <div>
              <label className="admin-field-label" htmlFor={`podcast-label-${link.id}`}>
                Where to find it
              </label>
              <input
                id={`podcast-label-${link.id}`}
                type="text"
                placeholder={index === 0 ? "Spotify" : "Apple Podcasts"}
                value={link.label}
                onChange={(event) =>
                  onPodcastLinksChange(
                    podcastLinks.map((entry) =>
                      entry.id === link.id ? { ...entry, label: event.target.value } : entry
                    )
                  )
                }
              />
            </div>
            <div>
              <label className="admin-field-label" htmlFor={`podcast-url-${link.id}`}>
                URL
              </label>
              <input
                id={`podcast-url-${link.id}`}
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(event) =>
                  onPodcastLinksChange(
                    podcastLinks.map((entry) =>
                      entry.id === link.id ? { ...entry, url: event.target.value } : entry
                    )
                  )
                }
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
