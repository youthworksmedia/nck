"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { LoaderCircle, MessageCircle, Send, X } from "lucide-react";

const storageKey = "alfi-helper-hidden";
const initialMessage =
  "Hi, I’m Alfi. I can help you find things around New Creation Kids. If you’re logged in, I can also help with member content that’s available to your account.";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export function FloatingChatHelper() {
  const [isHidden, setIsHidden] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "alfi-welcome",
      role: "assistant",
      content: initialMessage
    }
  ]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsHidden(window.localStorage.getItem(storageKey) === "true");
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [isLoading, isOpen, messages]);

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput || isLoading) {
      return;
    }

    const nextUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedInput
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/alfi-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Alfi could not answer right now.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.answer
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "I’m sorry, I couldn’t answer that right now. Please try again."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isReady) {
    return null;
  }

  if (isHidden) {
    return (
      <button
        type="button"
        className="floating-chat-helper-show"
        onClick={() => {
          window.localStorage.setItem(storageKey, "false");
          setIsHidden(false);
        }}
      >
        Show Alfi
      </button>
    );
  }

  return (
    <div className="floating-chat-helper" ref={panelRef}>
      {isOpen ? (
        <section className="floating-chat-panel" aria-label="Chat with Alfi">
          <div className="floating-chat-panel-head">
            <div>
              <strong>Ask Alfi</strong>
              <p>I&apos;m here to help, very keen!</p>
            </div>
            <button
              type="button"
              className="floating-chat-panel-dismiss"
              aria-label="Close Alfi chat"
              onClick={() => setIsOpen(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="floating-chat-messages" ref={messagesRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`floating-chat-message floating-chat-message-${message.role}`}
              >
                {message.role === "assistant" ? (
                  <Image
                    src="/dog-helper.png"
                    alt=""
                    width={42}
                    height={42}
                    className="floating-chat-avatar"
                  />
                ) : null}
                <div className="floating-chat-bubble">
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="floating-chat-message floating-chat-message-assistant">
                <Image
                  src="/dog-helper.png"
                  alt=""
                  width={42}
                  height={42}
                  className="floating-chat-avatar"
                />
                <div className="floating-chat-bubble floating-chat-bubble-loading">
                  <LoaderCircle size={16} className="floating-chat-spinner" />
                  <span>Alfi is thinking...</span>
                </div>
              </div>
            ) : null}
          </div>
          <form className="floating-chat-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="alfi-chat-input">
              Ask Alfi a question
            </label>
            <textarea
              id="alfi-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={3}
              placeholder="Ask how to find lessons, resources, account help, or team access..."
            />
            <button type="submit" className="button button-primary" disabled={isLoading}>
              <Send size={16} />
              <span>Send</span>
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className="floating-chat-helper-close"
        aria-label="Hide Alfi chatbot"
        onClick={() => {
          window.localStorage.setItem(storageKey, "true");
          setIsHidden(true);
          setIsOpen(false);
        }}
      >
        <X size={14} />
      </button>
      <button
        type="button"
        className="floating-chat-helper-link"
        aria-label="Open Alfi helper chat"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Image
          src="/dog-helper.png"
          alt="How can I help?"
          width={420}
          height={260}
          className="floating-chat-helper-image"
          priority
        />
        <span className="floating-chat-helper-badge">
          <MessageCircle size={15} />
          <span>Chat with Alfi</span>
        </span>
      </button>
    </div>
  );
}
