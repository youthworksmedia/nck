"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

type Props = {
  href: string;
  className?: string;
  title?: string;
  ariaLabel?: string;
  loadingLabel?: string;
  children: ReactNode;
};

export function PendingActionLink({
  href,
  className,
  title,
  ariaLabel,
  loadingLabel = "Preparing...",
  children
}: Props) {
  const [isPending, setIsPending] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isPending
    ) {
      return;
    }

    event.preventDefault();
    const destination = event.currentTarget.href;
    setIsPending(true);

    window.setTimeout(() => {
      window.location.assign(destination);
    }, 160);

    window.setTimeout(() => {
      setIsPending(false);
    }, 5000);
  }

  return (
    <a
      href={href}
      className={className}
      title={title}
      aria-label={ariaLabel}
      aria-busy={isPending}
      data-pending={isPending ? "true" : undefined}
      onClick={handleClick}
    >
      {isPending ? <span className="button-pending-dot" aria-hidden="true" /> : null}
      <span>{isPending ? loadingLabel : children}</span>
    </a>
  );
}
