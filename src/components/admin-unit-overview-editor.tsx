"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, FileText, GripVertical, Info, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { WysiwygEditor, type WysiwygEditorHandle } from "@/components/wysiwyg-editor";
import type { CurriculumSection, CurriculumYear } from "@/lib/curriculum";
import { getResourceIconKey, getResourceIconPath, resourceIconOptions } from "@/lib/resource-icon-paths";
import type { CurriculumUnitOverview } from "@/types";

type Props = {
  overview: CurriculumUnitOverview;
  yearCycle: CurriculumYear;
  term: CurriculumSection;
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

function isPdfFileName(fileName?: string | null) {
  return fileName?.split("?")[0]?.toLowerCase().endsWith(".pdf") ?? false;
}

function ResourceIconPreview({ icon }: { icon: string }) {
  const iconPath = getResourceIconPath("", null, "primary-school", icon);

  if (!iconPath) {
    return <FileText size={17} />;
  }

  return <img src={iconPath} alt="" />;
}

export function AdminUnitOverviewEditor({ overview, yearCycle, term }: Props) {
  const router = useRouter();
  const editorRef = useRef<WysiwygEditorHandle | null>(null);
  const [overviewHtml, setOverviewHtml] = useState(overview.overviewHtml);
  const [message, setMessage] = useState<string | null>(null);
  const [draggedGraphicId, setDraggedGraphicId] = useState<string | null>(null);
  const [dropTargetGraphicId, setDropTargetGraphicId] = useState<string | null>(null);
  const [openIconMenuId, setOpenIconMenuId] = useState<string | null>(null);
  const [addIcon, setAddIcon] = useState("unit-logo");
  const [addFileName, setAddFileName] = useState("");
  const [selectedFileNames, setSelectedFileNames] = useState<Record<string, string>>({});
  const [selectedIcons, setSelectedIcons] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOverviewHtml(overview.overviewHtml);
    setMessage(null);
    setDraggedGraphicId(null);
    setDropTargetGraphicId(null);
    setOpenIconMenuId(null);
    setAddIcon("unit-logo");
    setAddFileName("");
    setSelectedFileNames({});
    setSelectedIcons({});
  }, [overview.id, overview.overviewHtml, term, yearCycle]);

  function reorderGraphics(orderedIds: string[]) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/unit-overviews/graphics/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds })
      });
      const payload = await readJson(response);
      setMessage(payload.message ?? "Unit files reordered.");
      if (response.ok) router.refresh();
    });
  }

  function moveGraphic(graphicId: string, direction: -1 | 1) {
    const currentIndex = overview.graphics.findIndex((graphic) => graphic.id === graphicId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= overview.graphics.length) {
      return;
    }

    const orderedIds = overview.graphics.map((graphic) => graphic.id);
    const [moved] = orderedIds.splice(currentIndex, 1);
    orderedIds.splice(targetIndex, 0, moved);
    reorderGraphics(orderedIds);
  }

  function renderIconMenu(id: string, icon: string, onChange: (icon: string) => void) {
    return (
      <div
        className="admin-resource-type-menu admin-unit-icon-menu"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpenIconMenuId(null);
          }
        }}
      >
        <input type="hidden" name="icon" value={icon} />
        <button
          type="button"
          className="admin-resource-type-button"
          aria-haspopup="listbox"
          aria-expanded={openIconMenuId === id}
          onClick={() => setOpenIconMenuId((current) => (current === id ? null : id))}
        >
          <span>{resourceIconOptions.find((option) => option.value === icon)?.label ?? "Choose icon"}</span>
          <ResourceIconPreview icon={icon} />
          <ChevronDown size={17} />
        </button>
        {openIconMenuId === id ? (
          <div className="admin-resource-type-options" role="listbox" tabIndex={-1}>
            {resourceIconOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`admin-resource-type-option ${
                  option.value === icon ? "admin-resource-type-option-active" : ""
                }`}
                role="option"
                aria-selected={option.value === icon}
                onClick={() => {
                  onChange(option.value);
                  setOpenIconMenuId(null);
                }}
              >
                <span>{option.label}</span>
                <ResourceIconPreview icon={option.value} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="admin-unit-editor">
      <div className="admin-unit-editor-head">
        <div>
          <h2>Unit overview</h2>
          <p>Edit the unit card and files shown above {term} on the Teach page.</p>
        </div>
      </div>
      {message ? <p className="form-status">{message}</p> : null}
      <form
        id="admin-unit-overview-form"
        className="admin-unit-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const latestHtml = editorRef.current?.getHtml() ?? overviewHtml;
          setOverviewHtml(latestHtml);
          setMessage(null);

          startTransition(async () => {
            formData.set("yearCycle", yearCycle);
            formData.set("term", term);
            formData.set("overviewHtml", latestHtml);
            const response = await fetch("/api/admin/unit-overviews", {
              method: "POST",
              body: formData
            });
            const payload = await readJson(response);
            setMessage(payload.message ?? "Saved.");
            if (response.ok) router.refresh();
          });
        }}
      >
        <input name="eyebrow" defaultValue={overview.eyebrow} placeholder="Teach · Volume 1" />
        <input name="title" defaultValue={overview.title} placeholder="Unit 1" required />
        <input name="subtitle" defaultValue={overview.subtitle} placeholder="Luke - Set Free" />
        <select name="status" defaultValue={overview.status} aria-label="Status">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <label className="admin-file-inline admin-unit-hero-upload">
          <span>{overview.heroImageName || "Hero background image"}</span>
          <span className="admin-field-help" title="1280x209px image" aria-label="Recommended image size: 1280x209px">
            <Info size={14} />
          </span>
          <input name="heroImage" type="file" accept="image/*" />
        </label>
        {overview.heroImagePath ? (
          <label className="admin-unit-hero-remove">
            <input name="removeHeroImage" type="checkbox" value="true" />
            <span>Remove hero image</span>
          </label>
        ) : null}
        <WysiwygEditor
          ref={editorRef}
          label="Overview text"
          value={overviewHtml}
          onChange={setOverviewHtml}
          placeholder="Write the unit overview."
        />
        <div className="admin-unit-video-fields">
          <input name="introVideoTitle" defaultValue={overview.introVideoTitle} placeholder="Unit Introduction" />
          <input name="introVideoMeta" defaultValue={overview.introVideoMeta} placeholder="Video · 8 min" />
          <input name="introVideoDescription" defaultValue={overview.introVideoDescription} placeholder="Why this unit fits the bigger story" />
          <input name="introVideoUrl" defaultValue={overview.introVideoUrl ?? ""} placeholder="Unit introduction video URL" />
          <input name="deepDiveVideoTitle" defaultValue={overview.deepDiveVideoTitle} placeholder="Teaching Deep Dive" />
          <input name="deepDiveVideoMeta" defaultValue={overview.deepDiveVideoMeta} placeholder="Video · 14 min" />
          <input name="deepDiveVideoDescription" defaultValue={overview.deepDiveVideoDescription} placeholder="How to teach the key passages well" />
          <input name="deepDiveVideoUrl" defaultValue={overview.deepDiveVideoUrl ?? ""} placeholder="Teaching deep dive video URL" />
        </div>
      </form>

      <section className="admin-unit-graphics">
        <h3>Unit files</h3>
        <form
          className={`admin-unit-graphic-form admin-unit-graphic-add-form ${
            openIconMenuId === "add-unit-file" ? "admin-unit-graphic-form-menu-open" : ""
          }`}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            formData.set("yearCycle", yearCycle);
            formData.set("term", term);
            setMessage(null);

            startTransition(async () => {
              const response = await fetch("/api/admin/unit-overviews/graphics", { method: "POST", body: formData });
              const payload = await readJson(response);
              setMessage(payload.message ?? "Saved.");
              if (response.ok) {
                form.reset();
                setAddIcon("unit-logo");
                setAddFileName("");
                router.refresh();
              }
            });
          }}
        >
          <input name="title" placeholder="Unit Logo" required />
          {renderIconMenu("add-unit-file", addIcon, setAddIcon)}
          {isPdfFileName(addFileName) ? (
            <label className="admin-resource-copyright-toggle admin-unit-copyright-toggle">
              <span>©</span>
              <input
                name="includeCopyright"
                type="checkbox"
                value="true"
                aria-label="Add copyright footer to this PDF"
              />
            </label>
          ) : (
            <span className="admin-unit-copyright-spacer" aria-hidden="true" />
          )}
          <input name="displayOrder" type="hidden" defaultValue={overview.graphics.length + 1} />
          <input
            name="file"
            type="file"
            required
            onChange={(event) => setAddFileName(event.currentTarget.files?.[0]?.name ?? "")}
          />
          <button className="button button-primary" type="submit" disabled={isPending}>
            <Plus size={16} />
            <span>Add file</span>
          </button>
        </form>
        {overview.graphics.map((graphic, index) => {
          const selectedFileName = selectedFileNames[graphic.id] ?? graphic.fileName ?? "";
          const selectedIcon =
            selectedIcons[graphic.id] ??
            getResourceIconKey(graphic.title, graphic.fileName, graphic.icon) ??
            "unit-logo";

          return (
            <form
              className={`admin-unit-graphic-form ${
                dropTargetGraphicId === graphic.id ? "admin-unit-graphic-form-drop-target" : ""
              } ${openIconMenuId === graphic.id ? "admin-unit-graphic-form-menu-open" : ""}`}
              key={graphic.id}
              draggable
              onDragStart={() => setDraggedGraphicId(graphic.id)}
              onDragEnd={() => {
                setDraggedGraphicId(null);
                setDropTargetGraphicId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedGraphicId && draggedGraphicId !== graphic.id) {
                  setDropTargetGraphicId(graphic.id);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();

                if (!draggedGraphicId || draggedGraphicId === graphic.id) {
                  setDraggedGraphicId(null);
                  setDropTargetGraphicId(null);
                  return;
                }

                const orderedIds = overview.graphics.map((entry) => entry.id);
                const draggedIndex = orderedIds.indexOf(draggedGraphicId);
                const targetIndex = orderedIds.indexOf(graphic.id);

                if (draggedIndex >= 0 && targetIndex >= 0) {
                  const [moved] = orderedIds.splice(draggedIndex, 1);
                  orderedIds.splice(targetIndex, 0, moved);
                  reorderGraphics(orderedIds);
                }

                setDraggedGraphicId(null);
                setDropTargetGraphicId(null);
              }}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                setMessage(null);
                startTransition(async () => {
                  const response = await fetch(`/api/admin/unit-overviews/graphics/${graphic.id}`, { method: "PUT", body: formData });
                  const payload = await readJson(response);
                  setMessage(payload.message ?? "Saved.");
                  if (response.ok) router.refresh();
                });
              }}
            >
              <span className="admin-unit-graphic-drag" aria-hidden="true">
                <GripVertical size={16} />
              </span>
              <input name="title" defaultValue={graphic.title} required />
              {renderIconMenu(graphic.id, selectedIcon, (icon) =>
                setSelectedIcons((current) => ({ ...current, [graphic.id]: icon }))
              )}
              {isPdfFileName(selectedFileName) ? (
                <label className="admin-resource-copyright-toggle admin-unit-copyright-toggle">
                  <span>©</span>
                  <input
                    name="includeCopyright"
                    type="checkbox"
                    value="true"
                    defaultChecked={Boolean(graphic.includeCopyright)}
                    aria-label={`Add copyright footer to ${graphic.title}`}
                  />
                </label>
              ) : (
                <span className="admin-unit-copyright-spacer" aria-hidden="true" />
              )}
              <input name="displayOrder" type="hidden" defaultValue={graphic.displayOrder} />
              <span className="admin-unit-graphic-file-meta">
                <strong>{graphic.description || "File"}</strong>
              </span>
              <label className="admin-file-inline">
                <span>{graphic.fileName || "Upload file"}</span>
                <input
                  name="file"
                  type="file"
                  onChange={(event) =>
                    setSelectedFileNames((current) => ({
                      ...current,
                      [graphic.id]: event.currentTarget.files?.[0]?.name ?? graphic.fileName ?? ""
                    }))
                  }
                />
              </label>
              <input name="filePath" type="hidden" defaultValue={graphic.filePath ?? ""} />
              <input name="fileName" type="hidden" defaultValue={graphic.fileName ?? ""} />
              <select name="status" defaultValue={graphic.status} aria-label="Status">
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <div className="admin-unit-graphic-sort-actions" aria-label={`Sort ${graphic.title}`}>
                <button
                  className="icon-button"
                  type="button"
                  disabled={isPending || index === 0}
                  aria-label={`Move ${graphic.title} up`}
                  onClick={() => moveGraphic(graphic.id, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  disabled={isPending || index === overview.graphics.length - 1}
                  aria-label={`Move ${graphic.title} down`}
                  onClick={() => moveGraphic(graphic.id, 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              <button className="icon-button" type="submit" disabled={isPending} aria-label={`Save ${graphic.title}`}>
                <Save size={16} />
              </button>
              <button
                className="icon-button danger-button"
                type="button"
                disabled={isPending}
                aria-label={`Delete ${graphic.title}`}
                onClick={() => {
                  startTransition(async () => {
                    const response = await fetch(`/api/admin/unit-overviews/graphics/${graphic.id}`, { method: "DELETE" });
                    const payload = await readJson(response);
                    setMessage(payload.message ?? "Deleted.");
                    if (response.ok) router.refresh();
                  });
                }}
              >
                <Trash2 size={16} />
              </button>
            </form>
          );
        })}
      </section>
      <button className="button button-primary admin-unit-save-bottom" type="submit" form="admin-unit-overview-form" disabled={isPending}>
        <Save size={16} />
        <span>{isPending ? "Saving..." : "Save overview"}</span>
      </button>
    </section>
  );
}
