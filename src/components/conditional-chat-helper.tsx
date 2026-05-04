"use client";

import { usePathname } from "next/navigation";

import { FloatingChatHelper } from "@/components/floating-chat-helper";

export function ConditionalChatHelper() {
  const pathname = usePathname();

  if (pathname?.startsWith("/weather")) {
    return null;
  }

  return <FloatingChatHelper />;
}
