"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { WysiwygEditor } from "@/components/wysiwyg-editor";
import type { DashboardWelcomeSettings } from "@/lib/dashboard-settings";
import type { EmailTemplate, GeneralEmailSettings, HomepageSettings } from "@/lib/email-settings";

type Props = {
  templates: EmailTemplate[];
  generalSettings: GeneralEmailSettings;
  homepageSettings: HomepageSettings;
  dashboardSettings: DashboardWelcomeSettings;
};

type ActiveSettingsTab = "general" | "dashboard" | "homepage" | "email";

export function AdminEmailSettingsForm({
  templates,
  generalSettings,
  homepageSettings,
  dashboardSettings
}: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(templates);
  const [generalDraft, setGeneralDraft] = useState(generalSettings);
  const [homepageDraft, setHomepageDraft] = useState(homepageSettings);
  const [dashboardDraft, setDashboardDraft] = useState(dashboardSettings);
  const [activeKey, setActiveKey] = useState<ActiveSettingsTab>("general");
  const [activeTemplateKey, setActiveTemplateKey] = useState<EmailTemplate["key"]>(
    templates[0]?.key ?? "invite"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeTemplate =
    activeKey === "email" ? drafts.find((template) => template.key === activeTemplateKey) ?? drafts[0] : null;
  const availableCodes = getAvailableCodes(activeTemplate?.key);

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

  function saveGeneralSettings(nextDraft = generalDraft) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/email-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "general",
          isOffline: nextDraft.isOffline,
          siteUrl: nextDraft.siteUrl,
          senderName: nextDraft.senderName,
          senderEmail: nextDraft.senderEmail,
          renewalReminderDays: nextDraft.renewalReminderDays,
          cancellationSurveyUrl: nextDraft.cancellationSurveyUrl,
          supportEmail: nextDraft.supportEmail
        })
      });

      const payload = await response.json();
      setMessage(payload.message);

      if (response.ok) {
        router.refresh();
      }
    });
  }

  function updateReturningWelcomeMessage(index: number, returningHtml: string) {
    setDashboardDraft((current) => {
      const messages = current.returningHtmls.length
        ? current.returningHtmls
        : [current.returningHtml];
      const returningHtmls = messages.map((message, messageIndex) =>
        messageIndex === index ? returningHtml : message
      );

      return {
        ...current,
        returningHtml: returningHtmls[0] ?? "",
        returningHtmls
      };
    });
  }

  return (
    <div className="admin-settings-layout">
      <div className="admin-settings-tabs" role="tablist" aria-label="Email settings">
        <button
          type="button"
          role="tab"
          aria-selected={activeKey === "general"}
          className={`admin-settings-tab ${activeKey === "general" ? "admin-settings-tab-active" : ""}`}
          onClick={() => {
            setActiveKey("general");
            setMessage(null);
          }}
        >
          General
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeKey === "dashboard"}
          className={`admin-settings-tab ${activeKey === "dashboard" ? "admin-settings-tab-active" : ""}`}
          onClick={() => {
            setActiveKey("dashboard");
            setMessage(null);
          }}
        >
          Dashboard
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeKey === "homepage"}
          className={`admin-settings-tab ${activeKey === "homepage" ? "admin-settings-tab-active" : ""}`}
          onClick={() => {
            setActiveKey("homepage");
            setMessage(null);
          }}
        >
          Homepage
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeKey === "email"}
          className={`admin-settings-tab ${activeKey === "email" ? "admin-settings-tab-active" : ""}`}
          onClick={() => {
            setActiveKey("email");
            setMessage(null);
          }}
        >
          Email
        </button>
      </div>

      {activeKey === "general" ? (
        <form
          className="admin-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveGeneralSettings();
          }}
        >
          <label className="admin-toggle-row" htmlFor="site-offline">
            <span>
              <strong>Offline</strong>
              <small>Temporarily show the offline message on all frontend pages.</small>
            </span>
            <input
              id="site-offline"
              type="checkbox"
              role="switch"
              checked={generalDraft.isOffline}
              onChange={(event) => {
                const nextDraft = { ...generalDraft, isOffline: event.target.checked };
                setGeneralDraft(nextDraft);
                saveGeneralSettings(nextDraft);
              }}
            />
          </label>
          <div>
            <h2>General</h2>
            <p>Control the website URL used in email links and the sender details for outgoing emails.</p>
          </div>
          <label htmlFor="site-url">Site URL</label>
          <input
            id="site-url"
            type="url"
            placeholder="https://your-site.example"
            value={generalDraft.siteUrl}
            onChange={(event) => setGeneralDraft((current) => ({ ...current, siteUrl: event.target.value }))}
          />
          <p className="form-status form-status-small">
            If this is empty, links fall back to the current deployment URL.
          </p>
          <label htmlFor="sender-name">Sender name</label>
          <input
            id="sender-name"
            type="text"
            value={generalDraft.senderName}
            onChange={(event) => setGeneralDraft((current) => ({ ...current, senderName: event.target.value }))}
            required
          />
          <label htmlFor="sender-email">Sender email address</label>
          <input
            id="sender-email"
            type="email"
            value={generalDraft.senderEmail}
            onChange={(event) => setGeneralDraft((current) => ({ ...current, senderEmail: event.target.value }))}
            required
          />
          <label htmlFor="support-email">Support email address</label>
          <input
            id="support-email"
            type="email"
            value={generalDraft.supportEmail}
            onChange={(event) => setGeneralDraft((current) => ({ ...current, supportEmail: event.target.value }))}
            required
          />
          <label htmlFor="renewal-reminder-days">Renewal reminder days before expiry</label>
          <input
            id="renewal-reminder-days"
            type="number"
            min={1}
            max={180}
            value={generalDraft.renewalReminderDays}
            onChange={(event) =>
              setGeneralDraft((current) => ({
                ...current,
                renewalReminderDays: Number.parseInt(event.target.value, 10) || 30
              }))
            }
            required
          />
          <label htmlFor="cancellation-survey-url">Cancellation survey URL</label>
          <input
            id="cancellation-survey-url"
            type="url"
            placeholder="https://..."
            value={generalDraft.cancellationSurveyUrl}
            onChange={(event) =>
              setGeneralDraft((current) => ({ ...current, cancellationSurveyUrl: event.target.value }))
            }
          />
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={isPending}>
              <Save size={16} />
              <span>{isPending ? "Saving..." : "Save general settings"}</span>
            </button>
          </div>
          {message ? <p className="form-status">{message}</p> : null}
        </form>
      ) : null}

      {activeKey === "dashboard" ? (
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
                  type: "dashboard",
                  firstTimeHtml: dashboardDraft.firstTimeHtml,
                  returningHtml: dashboardDraft.returningHtmls[0] ?? dashboardDraft.returningHtml,
                  returningHtmls: dashboardDraft.returningHtmls,
                  bibleVerses: dashboardDraft.bibleVerses
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
            <h2>Dashboard / Welcome Messages</h2>
            <p>Edit the first-time welcome, returning-user welcome, embedded media, and verse rotation.</p>
          </div>
          <WysiwygEditor
            label="First-time dashboard content"
            value={dashboardDraft.firstTimeHtml}
            onChange={(firstTimeHtml) =>
              setDashboardDraft((current) => ({ ...current, firstTimeHtml }))
            }
          />
          <div className="admin-dashboard-message-list">
            <div>
              <h3>Returning-user dashboard content</h3>
              <p>Add multiple welcome messages. The dashboard rotates through them automatically.</p>
            </div>
            {(dashboardDraft.returningHtmls.length
              ? dashboardDraft.returningHtmls
              : [dashboardDraft.returningHtml]
            ).map((returningHtml, index) => (
              <fieldset className="admin-dashboard-message-card" key={index}>
                <legend>Message {index + 1}</legend>
                <WysiwygEditor
                  label={`Returning-user dashboard content ${index + 1}`}
                  value={returningHtml}
                  onChange={(nextHtml) => updateReturningWelcomeMessage(index, nextHtml)}
                />
                {(dashboardDraft.returningHtmls.length || 1) > 1 ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      setDashboardDraft((current) => {
                        const messages = current.returningHtmls.length
                          ? current.returningHtmls
                          : [current.returningHtml];
                        const returningHtmls = messages.filter((_, messageIndex) => messageIndex !== index);

                        return {
                          ...current,
                          returningHtml: returningHtmls[0] ?? "",
                          returningHtmls
                        };
                      })
                    }
                  >
                    Remove message
                  </button>
                ) : null}
              </fieldset>
            ))}
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                setDashboardDraft((current) => {
                  const messages = current.returningHtmls.length
                    ? current.returningHtmls
                    : [current.returningHtml];
                  const returningHtmls = [
                    ...messages,
                    "<h2>Welcome back!</h2><p>Everything you need for this week is one click away. Teach, Leaders, Family.</p>"
                  ];

                  return {
                    ...current,
                    returningHtml: returningHtmls[0] ?? "",
                    returningHtmls
                  };
                })
              }
            >
              Add returning message
            </button>
          </div>
          <div className="admin-dashboard-verse-list">
            <div>
              <h3>Bible verse cards</h3>
              <p>Add approved verses to rotate on member and account-holder dashboards.</p>
            </div>
            {dashboardDraft.bibleVerses.map((verse, index) => (
              <fieldset className="admin-dashboard-verse-card" key={index}>
                <legend>Verse {index + 1}</legend>
                <label htmlFor={`dashboard-verse-text-${index}`}>Verse text</label>
                <textarea
                  id={`dashboard-verse-text-${index}`}
                  value={verse.text}
                  onChange={(event) =>
                    setDashboardDraft((current) => ({
                      ...current,
                      bibleVerses: current.bibleVerses.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, text: event.target.value } : entry
                      )
                    }))
                  }
                  required
                />
                <label htmlFor={`dashboard-verse-reference-${index}`}>Reference</label>
                <input
                  id={`dashboard-verse-reference-${index}`}
                  type="text"
                  value={verse.reference}
                  onChange={(event) =>
                    setDashboardDraft((current) => ({
                      ...current,
                      bibleVerses: current.bibleVerses.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, reference: event.target.value } : entry
                      )
                    }))
                  }
                  required
                />
                {dashboardDraft.bibleVerses.length > 1 ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      setDashboardDraft((current) => ({
                        ...current,
                        bibleVerses: current.bibleVerses.filter((_, entryIndex) => entryIndex !== index)
                      }))
                    }
                  >
                    Remove verse
                  </button>
                ) : null}
              </fieldset>
            ))}
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                setDashboardDraft((current) => ({
                  ...current,
                  bibleVerses: [...current.bibleVerses, { text: "", reference: "" }]
                }))
              }
            >
              Add verse
            </button>
          </div>
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={isPending}>
              <Save size={16} />
              <span>{isPending ? "Saving..." : "Save dashboard settings"}</span>
            </button>
          </div>
          {message ? <p className="form-status">{message}</p> : null}
        </form>
      ) : null}

      {activeKey === "homepage" ? (
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
                  type: "homepage",
                  testimonials: homepageDraft.testimonials
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
            <h2>Homepage testimonials</h2>
            <p>These credibility quotes appear near the bottom of the homepage.</p>
          </div>
          <div className="admin-testimonial-list">
            {homepageDraft.testimonials.map((testimonial, index) => (
              <fieldset key={index} className="admin-testimonial-card">
                <legend>Testimonial {index + 1}</legend>
                <label htmlFor={`testimonial-quote-${index}`}>Quote</label>
                <textarea
                  id={`testimonial-quote-${index}`}
                  value={testimonial.quote}
                  onChange={(event) =>
                    setHomepageDraft((current) => ({
                      testimonials: current.testimonials.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, quote: event.target.value } : entry
                      )
                    }))
                  }
                  required
                />
                <label htmlFor={`testimonial-name-${index}`}>Name</label>
                <input
                  id={`testimonial-name-${index}`}
                  type="text"
                  value={testimonial.name}
                  onChange={(event) =>
                    setHomepageDraft((current) => ({
                      testimonials: current.testimonials.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, name: event.target.value } : entry
                      )
                    }))
                  }
                  required
                />
                <label htmlFor={`testimonial-church-${index}`}>Role or church</label>
                <input
                  id={`testimonial-church-${index}`}
                  type="text"
                  value={testimonial.church}
                  onChange={(event) =>
                    setHomepageDraft((current) => ({
                      testimonials: current.testimonials.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, church: event.target.value } : entry
                      )
                    }))
                  }
                />
              </fieldset>
            ))}
          </div>
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={isPending}>
              <Save size={16} />
              <span>{isPending ? "Saving..." : "Save homepage settings"}</span>
            </button>
          </div>
          {message ? <p className="form-status">{message}</p> : null}
        </form>
      ) : null}

      {activeTemplate ? (
        <section className="admin-settings-form">
          <div>
            <h2>Email</h2>
            <p>Choose an email template below and edit its subject and message.</p>
          </div>
          <div className="admin-email-template-tabs" role="tablist" aria-label="Email templates">
            {drafts.map((template) => (
              <button
                key={template.key}
                type="button"
                role="tab"
                aria-selected={activeTemplate.key === template.key}
                className={`admin-settings-tab ${
                  activeTemplate.key === template.key ? "admin-settings-tab-active" : ""
                }`}
                onClick={() => {
                  setActiveTemplateKey(template.key);
                  setMessage(null);
                }}
              >
                {template.label}
              </button>
            ))}
          </div>
          <form
            className="admin-email-template-form"
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
              <h3>{activeTemplate.label}</h3>
              <p>{activeTemplate.description}</p>
              <p className="form-status form-status-small">Available codes: {availableCodes}</p>
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
        </section>
      ) : null}
    </div>
  );
}

function getAvailableCodes(key?: EmailTemplate["key"]) {
  if (key === "invite") {
    return "{{inviteUrl}}, {{actionUrl}}, {{loginUrl}}, {{siteUrl}}";
  }

  if (key === "reset") {
    return "{{resetUrl}}, {{actionUrl}}, {{loginUrl}}, {{siteUrl}}";
  }

  if (
    key === "renewal_reminder" ||
    key === "renewal_confirmation" ||
    key === "payment_success" ||
    key === "payment_failed" ||
    key === "refund_requested" ||
    key === "refund_confirmation" ||
    key === "cancellation_confirmation" ||
    key === "access_expiry"
  ) {
    return "{{accountHolderName}}, {{churchName}}, {{planName}}, {{amount}}, {{renewalDate}}, {{accessEndsDate}}, {{daysUntilRenewal}}, {{accountUrl}}, {{surveyUrl}}, {{siteUrl}}, {{supportEmail}}";
  }

  return "{{accountHolderName}}, {{churchName}}, {{planName}}, {{loginUrl}}, {{siteUrl}}";
}
