import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";

import { PhotoLibraryBrowser } from "@/components/photo-library-browser";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getPublishedPhotos } from "@/lib/photo-library";
import { getMemberAccessSnapshot } from "@/lib/portal";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Image Library",
  description: "Photos of Bible places for leader teaching resources."
});

export default async function PhotoLibraryPage() {
  const [access, photos] = await Promise.all([getMemberAccessSnapshot(), getPublishedPhotos()]);

  if (!access.user) {
    redirect("/login");
  }

  if (!access.hasActiveAccount) {
    redirect("/account");
  }

  return (
    <main className="site-shell section account-page games-library-page photo-library-page">
      <Link className="games-back-link" href="/leaders">
        <ArrowLeft size={16} />
        Back to Leader Resources
      </Link>
      <section className="games-library-head">
        <span className="eyebrow">
          <ImageIcon size={18} />
          Leaders · Image Library
        </span>
        <h1>Image Library</h1>
        <p>Photos of places from the Bible, ready for leaders to browse, download, and reference from teaching entries.</p>
      </section>
      <PhotoLibraryBrowser photos={photos} />
    </main>
  );
}
