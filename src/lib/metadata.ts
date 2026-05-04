import type { Metadata } from "next";

export const siteName = "New Creation Kids";
export const siteDescription =
  "Bible teaching resources, curriculum planning, downloadable worksheets, shared accounts, and lesson resources for churches and kids ministry teams.";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3001";

export const metadataBase = new URL(rawSiteUrl);

type MetadataOptions = {
  title: string;
  description: string;
  path?: string;
};

export function buildPublicMetadata({ title, description, path = "/" }: MetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName,
      type: "website",
      locale: "en_AU"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export function buildPrivateMetadata({ title, description }: MetadataOptions): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true
    }
  };
}
