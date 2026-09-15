import type { Metadata } from "next";
import { Suspense } from "react";

import "@/app/globals.css";
import { GlobalPageLoadMonitor } from "@/components/global-page-load-monitor";
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
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/nck-logo.png", sizes: "160x160", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <GlobalPageLoadMonitor />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
