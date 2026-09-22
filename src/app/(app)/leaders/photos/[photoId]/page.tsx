import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { buildPrivateMetadata } from "@/lib/metadata";
import { getMemberAccessSnapshot } from "@/lib/portal";
import { getPhotoById, getPublishedPhotos } from "@/lib/photo-library";

type Props = {
  params: Promise<{ photoId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { photoId } = await params;
  const photo = await getPhotoById(photoId);

  return buildPrivateMetadata({
    title: photo ? `${photo.title} | Image Library` : "Photo | Image Library",
    description: photo?.description ?? "Bible places photo library image."
  });
}

export async function generateStaticParams() {
  const photos = await getPublishedPhotos();

  return photos.map((photo) => ({ photoId: photo.id }));
}

export default async function PhotoDetailPage({ params }: Props) {
  const [{ photoId }, access] = await Promise.all([params, getMemberAccessSnapshot()]);

  if (!access.user) {
    redirect("/login");
  }

  if (!access.hasActiveAccount) {
    redirect("/account");
  }

  const photo = await getPhotoById(photoId);

  if (!photo) {
    notFound();
  }

  return (
    <main className="site-shell section account-page game-detail-page photo-detail-page">
      <Link className="games-back-link" href="/leaders/photos">
        <ArrowLeft size={16} />
        Back to Image Library
      </Link>
      <article className="photo-detail-content">
        <div className="photo-detail-frame">
          <Image src={photo.imagePath} alt={photo.title} fill sizes="(max-width: 900px) 100vw, 900px" priority />
        </div>
        <div className="photo-detail-copy">
          <h1>{photo.title}</h1>
          <p>{photo.description}</p>
          <a className="button button-primary" href={photo.imagePath} download={photo.fileName}>
            <Download size={16} />
            <span>Download image</span>
          </a>
        </div>
      </article>
    </main>
  );
}
