import type { Metadata } from "next";

import { ConditionalChatHelper } from "@/components/conditional-chat-helper";
import "@/app/globals.css";
import { metadataBase, siteDescription, siteName } from "@/lib/metadata";

export const metadata: Metadata = {
  metadataBase,
  applicationName: siteName,
  manifest: "/manifest.webmanifest",
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "kids ministry curriculum",
    "Sunday school lessons",
    "church teaching resources",
    "Bible lesson tools",
    "kids church worksheets",
    "Australian church curriculum"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    siteName,
    type: "website",
    locale: "en_AU",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ConditionalChatHelper />
      </body>
    </html>
  );
}
