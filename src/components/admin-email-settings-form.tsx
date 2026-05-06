"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { EmailTemplate } from "@/lib/email-settings";

type Props = {
  templates: EmailTemplate[];
};

export function AdminEmailSettingsForm({ templates }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(templates);
  const [activeKey, setActiveKey] = useState(templates[0]?.key ?? "invite");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeTemplate = drafts.find((template) => template.key === activeKey) ?? drafts[0];

  function updateActiveTemplate(nextValues: Partial<EmailTemplate>) {
    if (!activeTemplate) {
      return;
    }

    setDrafts((current) =>
      current.map((template) =>
        template.key === activeTemplate.key ? { ...template, ...nextValues } : template
      )
    );
  }

  return (
    <div className="admin-settings-layout">
      <div className="admin-settings-tabs" role="tablist" aria-label="Email settings">
        {drafts.map((template) => (
          <button
            key={template.key}
            type="button"
            role="tab"
            aria-selected={activeKey === template.key}
            className={`admin-settings-tab ${activeKey === template.key ? "admin-settings-tab-active" : ""}`}
            onClick={() => {
              setActiveKey(template.key);
              setMessage(null);
            }}
          >
            {template.label}
          </button>
        ))}
      </div>

      {activeTemplate ? (
        <form
          className="admin-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);

            startTransition(async () => {
              const response = await fetch("/api/admin/email-settings", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  key: activeTemplate.key,
                  subject: activeTemplate.subject,
                  body: activeTemplate.body
                })
              });

              const payload = await response.json();
              setMessage(payload.message);

              if (response.ok) {
                router.refresh();
              }
            });
          }}
        >
          <div>
            <h2>{activeTemplate.label}</h2>
            <p>{activeTemplate.description}</p>
          </div>
          <label htmlFor="email-template-subject">Subject</label>
          <input
            id="email-template-subject"
            type="text"
            value={activeTemplate.subject}
            onChange={(event) => updateActiveTemplate({ subject: event.target.value })}
            required
          />
          <label htmlFor="email-template-body">Email content</label>
          <textarea
            id="email-template-body"
            value={activeTemplate.body}
            onChange={(event) => updateActiveTemplate({ body: event.target.value })}
            required
          />
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={isPending}>
              <Save size={16} />
              <span>{isPending ? "Saving..." : "Save template"}</span>
            </button>
          </div>
          {message ? <p className="form-status">{message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
