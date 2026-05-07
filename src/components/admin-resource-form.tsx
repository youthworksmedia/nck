"use client";

import type { Route } from "next";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  AdminLessonResourceFields,
  emptyResourceDrafts,
  type LessonResourceDraft
} from "@/components/admin-lesson-resource-fields";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import type { ResourceLibraryFile } from "@/lib/resource-assets";
import { getTodayISO } from "@/lib/time";

type Props = {
  files: ResourceLibraryFile[];
  initialYearCycle: "Year A" | "Year B" | "Year C";
  initialTerm: "Term 1" | "Term 2" | "Term 3" | "Term 4";
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

export function AdminResourceForm({ files: _files, initialYearCycle, initialTerm, basePath = "/content" }: Props) {
  const router = useRouter();
  void _files;
  const today = getTodayISO();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scripture, setScripture] = useState("");
  const [yearCycle, setYearCycle] = useState<"Year A" | "Year B" | "Year C">(initialYearCycle);
  const [term, setTerm] = useState<"Term 1" | "Term 2" | "Term 3" | "Term 4">(initialTerm);
  const [publishDate, setPublishDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [resourceFiles, setResourceFiles] = useState<LessonResourceDraft[]>(() => emptyResourceDrafts());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    setResourceFiles(emptyResourceDrafts());
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

        startTransition(async () => {
          const formData = new FormData();
          formData.set("title", title);
          formData.set("description", description);
          formData.set("scripture", scripture);
          formData.set("yearCycle", yearCycle);
          formData.set("term", term);
          formData.set("publishDate", publishDate);
          formData.set("expiryDate", expiryDate);
          formData.set("status", status);
          formData.set(
            "resourceFiles",
            JSON.stringify(
              resourceFiles.map(({ file: _file, ...entry }) => ({
                ...entry,
                name: entry.name.trim() || entry.fileName || "Resource"
              }))
            )
          );

          resourceFiles.forEach((entry) => {
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
          setYearCycle(initialYearCycle);
          setTerm(initialTerm);
          setPublishDate(today);
          setExpiryDate("");
          setStatus("open");
          setResourceFiles(emptyResourceDrafts());
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
          <label className="admin-field-label" htmlFor="resource-year-cycle">
            Year *
          </label>
          <select
            id="resource-year-cycle"
            value={yearCycle}
            onChange={(event) => setYearCycle(event.target.value as "Year A" | "Year B" | "Year C")}
            required
          >
            <option value="Year A">Year A</option>
            <option value="Year B">Year B</option>
            <option value="Year C">Year C</option>
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
              setTerm(event.target.value as "Term 1" | "Term 2" | "Term 3" | "Term 4")
            }
            required
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
            <option value="Term 4">Term 4</option>
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
      <AdminLessonResourceFields value={resourceFiles} onChange={setResourceFiles} />
      <WysiwygEditor
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
