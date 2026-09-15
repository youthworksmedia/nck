"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { ModalPortal } from "@/components/modal-portal";
import { WysiwygEditor, type WysiwygEditorHandle } from "@/components/wysiwyg-editor";
import type { HelpFaqItem, HelpFaqSection } from "@/types";

type Props = {
  sections: HelpFaqSection[];
};

function statusMessageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function submitForm(url: string, form: HTMLFormElement, method = "POST") {
  const response = await fetch(url, {
    method,
    body: new FormData(form)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to save FAQ content.");
  }
}

async function deleteEntry(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to delete FAQ content.");
  }
}

export function AdminHelpFaqs({ sections }: Props) {
  const [message, setMessage] = useState("");
  const [editingItem, setEditingItem] = useState<HelpFaqItem | null>(null);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<WysiwygEditorHandle | null>(null);

  const refreshWithMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.location.reload();
  };

  return (
    <div className="admin-faq-editor">
      {message ? <p className="admin-form-status">{message}</p> : null}
      <form
        className="admin-faq-section-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          startTransition(async () => {
            try {
              await submitForm("/api/admin/help-faqs/sections", form);
              refreshWithMessage("FAQ group added.");
            } catch (error) {
              setMessage(statusMessageFromError(error));
            }
          });
        }}
      >
        <input name="title" placeholder="Group title" required />
        <input name="description" placeholder="Short description" />
        <input name="displayOrder" type="number" min="0" defaultValue={sections.length + 1} aria-label="Display order" />
        <label className="admin-faq-visibility-toggle">
          <input name="visibleToAccountHolders" type="checkbox" defaultChecked />
          <span>Account holders</span>
        </label>
        <label className="admin-faq-visibility-toggle">
          <input name="visibleToTeamMembers" type="checkbox" defaultChecked />
          <span>Team members</span>
        </label>
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Plus size={16} />
          <span>Add group</span>
        </button>
      </form>

      <div className="stack-sm">
        {sections.map((section) => (
          <section className="admin-faq-section" key={section.id}>
            <form
              className="admin-faq-section-head"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                startTransition(async () => {
                  try {
                    await submitForm(`/api/admin/help-faqs/sections/${section.id}`, form, "PUT");
                    refreshWithMessage("FAQ group saved.");
                  } catch (error) {
                    setMessage(statusMessageFromError(error));
                  }
                });
              }}
            >
              <input name="title" defaultValue={section.title} aria-label="Group title" required />
              <input name="description" defaultValue={section.description} aria-label="Group description" />
              <input name="displayOrder" type="number" min="0" defaultValue={section.displayOrder} aria-label="Display order" />
              <select name="status" defaultValue={section.status} aria-label="Status">
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <label className="admin-faq-visibility-toggle">
                <input name="visibleToAccountHolders" type="checkbox" defaultChecked={section.visibleToAccountHolders} />
                <span>Account holders</span>
              </label>
              <label className="admin-faq-visibility-toggle">
                <input name="visibleToTeamMembers" type="checkbox" defaultChecked={section.visibleToTeamMembers} />
                <span>Team members</span>
              </label>
              <button className="icon-button" type="submit" aria-label={`Save ${section.title}`} disabled={isPending}>
                <Save size={16} />
              </button>
              <button
                className="icon-button danger-button"
                type="button"
                aria-label={`Delete ${section.title}`}
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await deleteEntry(`/api/admin/help-faqs/sections/${section.id}`);
                      refreshWithMessage("FAQ group deleted.");
                    } catch (error) {
                      setMessage(statusMessageFromError(error));
                    }
                  });
                }}
              >
                <Trash2 size={16} />
              </button>
            </form>

            <div className="admin-faq-items">
              {section.items.map((item) => (
                <form
                  className="admin-faq-item-form"
                  key={item.id}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    startTransition(async () => {
                      try {
                        await submitForm(`/api/admin/help-faqs/items/${item.id}`, form, "PUT");
                        refreshWithMessage("FAQ saved.");
                      } catch (error) {
                        setMessage(statusMessageFromError(error));
                      }
                    });
                  }}
                >
                  <input name="question" defaultValue={item.question} aria-label="Question" required />
                  <input type="hidden" name="answerHtml" defaultValue={item.answerHtml} />
                  <input name="displayOrder" type="number" min="0" defaultValue={item.displayOrder} aria-label="Display order" />
                  <select name="status" defaultValue={item.status} aria-label="Status">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setDraftAnswer(item.answerHtml);
                    }}
                  >
                    <Pencil size={14} />
                    <span>Answer</span>
                  </button>
                  <button className="icon-button" type="submit" aria-label={`Save ${item.question}`} disabled={isPending}>
                    <Save size={16} />
                  </button>
                  <button
                    className="icon-button danger-button"
                    type="button"
                    aria-label={`Delete ${item.question}`}
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await deleteEntry(`/api/admin/help-faqs/items/${item.id}`);
                          refreshWithMessage("FAQ deleted.");
                        } catch (error) {
                          setMessage(statusMessageFromError(error));
                        }
                      });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              ))}

              <form
                className="admin-faq-item-form admin-faq-item-add-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  startTransition(async () => {
                    try {
                      await submitForm("/api/admin/help-faqs/items", form);
                      refreshWithMessage("FAQ added.");
                    } catch (error) {
                      setMessage(statusMessageFromError(error));
                    }
                  });
                }}
              >
                <input type="hidden" name="sectionId" value={section.id} />
                <input name="question" placeholder="Question" required />
                <input type="hidden" name="answerHtml" value="<p>Add the answer here.</p>" />
                <input name="displayOrder" type="number" min="0" defaultValue={section.items.length + 1} aria-label="Display order" />
                <select name="status" defaultValue="open" aria-label="Status">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
                <button className="button button-primary" type="submit" disabled={isPending}>
                  <Plus size={16} />
                  <span>Add FAQ</span>
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>

      {editingItem ? (
        <ModalPortal>
          <div className="modal-backdrop" role="presentation" onClick={() => setEditingItem(null)}>
            <div
              className="modal-card admin-term-note-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="faq-answer-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h3 id="faq-answer-modal">Edit answer</h3>
                  <p>{editingItem.question}</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setEditingItem(null)}
                  aria-label="Close answer editor"
                >
                  <X size={16} />
                </button>
              </div>

              <WysiwygEditor
                ref={editorRef}
                label="Answer"
                value={draftAnswer}
                onChange={setDraftAnswer}
                placeholder="Write the answer."
              />
              <div className="button-row">
                <button type="button" className="button button-secondary" onClick={() => setEditingItem(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={isPending}
                  onClick={() => {
                    const latestDraft = editorRef.current?.getHtml() ?? draftAnswer;
                    const formData = new FormData();
                    formData.set("question", editingItem.question);
                    formData.set("answerHtml", latestDraft);
                    formData.set("displayOrder", String(editingItem.displayOrder));
                    formData.set("status", editingItem.status);

                    startTransition(async () => {
                      const response = await fetch(`/api/admin/help-faqs/items/${editingItem.id}`, {
                        method: "PUT",
                        body: formData
                      });
                      const data = await response.json().catch(() => ({}));

                      if (!response.ok) {
                        setMessage(data.message ?? "Unable to save answer.");
                        return;
                      }

                      setEditingItem(null);
                      refreshWithMessage("Answer saved.");
                    });
                  }}
                >
                  <Save size={16} />
                  <span>Save answer</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
