"use client";

import { Pencil, Save, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ModalPortal } from "@/components/modal-portal";
import { WysiwygEditor, type WysiwygEditorHandle } from "@/components/wysiwyg-editor";
import type { CurriculumSection, CurriculumYear } from "@/lib/curriculum";

type Props = {
  yearCycle: CurriculumYear;
  term: CurriculumSection;
  initialContent: string;
};

export function AdminTermNoteEditor({ yearCycle, term, initialContent }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [draft, setDraft] = useState(initialContent);
  const [message, setMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<WysiwygEditorHandle | null>(null);

  useEffect(() => {
    setContent(initialContent);
    setDraft(initialContent);
    setMessage(null);
    setIsOpen(false);
  }, [initialContent, yearCycle, term]);

  return (
    <>
      <div className="admin-term-note">
        <div className="admin-term-note-head">
          {content ? (
            <div className="admin-term-note-copy resource-html" dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p className="admin-term-note-copy">
              Add a short introduction for this term, including theme notes, memory verses, or key teaching focus.
            </p>
          )}
          <button
            type="button"
            className="button button-secondary admin-term-note-edit"
            onClick={() => {
              setDraft(content);
              setMessage(null);
              setIsOpen(true);
            }}
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {isOpen ? (
        <ModalPortal>
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className="modal-card admin-term-note-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`term-note-modal-${yearCycle}-${term}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id={`term-note-modal-${yearCycle}-${term}`}>Edit term text</h3>
                <p>
                  {yearCycle} {term}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Close term text window"
              >
                <X size={16} />
              </button>
            </div>

            <WysiwygEditor
              ref={editorRef}
              label="Term text"
              value={draft}
              onChange={setDraft}
              placeholder="Write a short overview for this term."
            />
            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={isPending}
                onClick={() => {
                  setMessage(null);
                  const latestDraft = editorRef.current?.getHtml() ?? draft;
                  setDraft(latestDraft);

                  startTransition(async () => {
                    const response = await fetch("/api/admin/term-notes", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        yearCycle,
                        term,
                        content: latestDraft
                      })
                    });

                    const payload = await response.json();
                    setMessage(payload.message ?? null);

                    if (response.ok) {
                      setContent(latestDraft);
                      setIsOpen(false);
                      router.refresh();
                    }
                  });
                }}
              >
                <Save size={16} />
                <span>{isPending ? "Saving..." : "Save"}</span>
              </button>
            </div>
            {message ? <p className="form-status">{message}</p> : null}
          </div>
        </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
