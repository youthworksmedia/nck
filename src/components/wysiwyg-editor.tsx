"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Bold,
  Code2,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Underline as UnderlineIcon,
  Waypoints
} from "lucide-react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export type WysiwygEditorHandle = {
  getHtml: () => string;
};

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "insertOrderedList";

const allowedTags = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "EM",
  "H2",
  "I",
  "IFRAME",
  "IMG",
  "LI",
  "OL",
  "P",
  "STRONG",
  "U",
  "UL"
]);

const allowedIframeHosts = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com"
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeUrl(raw: string) {
  try {
    const url = new URL(raw);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeHtml(raw: string) {
  if (!raw.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  function sanitizeNode(node: Node): Node | DocumentFragment | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toUpperCase();

    if (!allowedTags.has(tagName)) {
      const fragment = document.createDocumentFragment();

      Array.from(element.childNodes).forEach((child) => {
        const sanitizedChild = sanitizeNode(child);

        if (sanitizedChild) {
          fragment.appendChild(sanitizedChild);
        }
      });

      return fragment;
    }

    const clean = document.createElement(tagName.toLowerCase());

    if (tagName === "A") {
      const href = normalizeUrl(element.getAttribute("href") ?? "");

      if (href) {
        clean.setAttribute("href", href);
        clean.setAttribute("target", "_blank");
        clean.setAttribute("rel", "noreferrer");
      }
    }

    if (tagName === "IMG") {
      const src = normalizeUrl(element.getAttribute("src") ?? "");

      if (!src) {
        return null;
      }

      clean.setAttribute("src", src);
      clean.setAttribute("alt", element.getAttribute("alt") ?? "");
      clean.setAttribute("loading", "lazy");
      return clean;
    }

    if (tagName === "IFRAME") {
      const src = normalizeUrl(element.getAttribute("src") ?? "");

      if (!src) {
        return null;
      }

      const url = new URL(src);
      const isAllowedHost = allowedIframeHosts.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      );

      if (!isAllowedHost) {
        return null;
      }

      clean.setAttribute("src", src);
      clean.setAttribute("title", element.getAttribute("title") ?? "Embedded content");
      clean.setAttribute("loading", "lazy");
      clean.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      clean.setAttribute("allowfullscreen", "true");
      clean.setAttribute("width", element.getAttribute("width") ?? "560");
      clean.setAttribute("height", element.getAttribute("height") ?? "315");
      return clean;
    }

    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child);

      if (sanitizedChild) {
        clean.appendChild(sanitizedChild);
      }
    });

    return clean;
  }

  const wrapper = document.createElement("div");

  Array.from(doc.body.childNodes).forEach((child) => {
    const sanitized = sanitizeNode(child);

    if (sanitized) {
      wrapper.appendChild(sanitized);
    }
  });

  return wrapper.innerHTML;
}

function textToHtml(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

export const WysiwygEditor = forwardRef<WysiwygEditorHandle, Props>(function WysiwygEditor(
  { label, value, onChange, placeholder },
  ref
) {
  const editorId = useId();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [sourceMode, setSourceMode] = useState(false);

  useEffect(() => {
    if (!editorRef.current || sourceMode) {
      return;
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [sourceMode, value]);

  function commitEditorHtml() {
    const nextValue = getCurrentHtml();
    flushSync(() => {
      onChange(nextValue);
    });
  }

  function getCurrentHtml() {
    return sanitizeHtml(sourceMode ? value : editorRef.current?.innerHTML ?? value);
  }

  useImperativeHandle(ref, () => ({
    getHtml: getCurrentHtml
  }));

  function applyCommand(command: Command) {
    editorRef.current?.focus();
    document.execCommand(command);
    commitEditorHtml();
  }

  function applyBlock(tag: "p" | "h2" | "blockquote") {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    commitEditorHtml();
  }

  function addLink() {
    editorRef.current?.focus();
    const url = window.prompt("Enter the link URL");
    const normalized = url ? normalizeUrl(url) : null;

    if (!normalized) {
      return;
    }

    document.execCommand("createLink", false, normalized);
    commitEditorHtml();
  }

  function addImage() {
    const url = window.prompt("Paste the image URL");
    const normalized = url ? normalizeUrl(url) : null;

    if (!normalized) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand("insertImage", false, normalized);
    commitEditorHtml();
  }

  function addEmbed() {
    const embedCode = window.prompt("Paste the embed HTML");

    if (!embedCode) {
      return;
    }

    const sanitized = sanitizeHtml(embedCode);

    if (!sanitized) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand("insertHTML", false, sanitized);
    commitEditorHtml();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();

    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const sanitized = html ? sanitizeHtml(html) : textToHtml(text);

    document.execCommand("insertHTML", false, sanitized);
    commitEditorHtml();
  }

  return (
    <div className="wysiwyg-shell">
      <label className="admin-field-label" htmlFor={editorId}>
        {label}
      </label>
      <div className="wysiwyg-toolbar" role="toolbar" aria-label={`${label} formatting`}>
        <button
          type="button"
          className="icon-button"
          aria-label="Paragraph"
          title="Paragraph"
          onClick={() => applyBlock("p")}
        >
          <Pilcrow size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Heading"
          title="Heading"
          onClick={() => applyBlock("h2")}
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Bold"
          title="Bold"
          onClick={() => applyCommand("bold")}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Italic"
          title="Italic"
          onClick={() => applyCommand("italic")}
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Underline"
          title="Underline"
          onClick={() => applyCommand("underline")}
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Bulleted list"
          title="Bulleted list"
          onClick={() => applyCommand("insertUnorderedList")}
        >
          <List size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Numbered list"
          title="Numbered list"
          onClick={() => applyCommand("insertOrderedList")}
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Quote"
          title="Quote"
          onClick={() => applyBlock("blockquote")}
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Link"
          title="Link"
          onClick={addLink}
        >
          <Link2 size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Image"
          title="Image"
          onClick={addImage}
        >
          <ImagePlus size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Embed"
          title="Embed"
          onClick={addEmbed}
        >
          <Waypoints size={16} />
        </button>
        <button
          type="button"
          className={`icon-button${sourceMode ? " icon-button-active" : ""}`}
          aria-label="Source"
          title="Source"
          onClick={() => setSourceMode((current) => !current)}
        >
          <Code2 size={16} />
        </button>
      </div>
      {sourceMode ? (
        <textarea
          id={editorId}
          className="admin-textarea wysiwyg-source"
          value={value}
          onChange={(event) => onChange(sanitizeHtml(event.target.value))}
          placeholder={placeholder}
        />
      ) : (
        <div
          id={editorId}
          ref={editorRef}
          className="wysiwyg-editor"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder ?? ""}
          onInput={commitEditorHtml}
          onBlur={commitEditorHtml}
          onPaste={handlePaste}
        />
      )}
    </div>
  );
});
