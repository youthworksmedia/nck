"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { PhotoLibraryImage } from "@/lib/photo-library";

type Props = {
  photos: PhotoLibraryImage[];
};

const pageSize = 36;

function getPhotoDownloadHref(photo: PhotoLibraryImage) {
  return photo.imagePath.startsWith("/api/leaders/photos/") ? `${photo.imagePath}?download=1` : photo.imagePath;
}

export function PhotoLibraryBrowser({ photos }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredPhotos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return photos.filter((photo) => {
      if (!normalizedQuery) return true;

      return [photo.title, photo.description, photo.fileName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [photos, query]);
  const pageCount = Math.max(1, Math.ceil(filteredPhotos.length / pageSize));
  const activePage = Math.min(page, pageCount);
  const pagedPhotos = filteredPhotos.slice((activePage - 1) * pageSize, activePage * pageSize);

  return (
    <section className="photo-library-browser">
      <div className="games-library-controls">
        <label className="games-search">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search photos..."
          />
        </label>
      </div>

      {pagedPhotos.length ? (
        <div className="photo-library-grid">
          {pagedPhotos.map((photo) => (
            <article className="photo-library-card" key={photo.id}>
              <Link className="photo-library-thumb" href={`/leaders/photos/${photo.id}`}>
                <Image
                  src={photo.imagePath}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 760px) 50vw, 16vw"
                  unoptimized={photo.imagePath.startsWith("/api/")}
                />
              </Link>
              <div className="photo-library-card-copy">
                <Link href={`/leaders/photos/${photo.id}`}>{photo.title}</Link>
                <p>{photo.description}</p>
              </div>
              <a className="photo-download-button" href={getPhotoDownloadHref(photo)} download={photo.fileName} aria-label={`Download ${photo.title}`}>
                <Download size={16} />
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p className="games-empty">No photos match your search yet.</p>
      )}

      {filteredPhotos.length > pageSize ? (
        <div className="photo-pagination" aria-label="Photo library pagination">
          <button type="button" disabled={activePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            <ArrowLeft size={16} />
            Previous
          </button>
          <span>
            Page {activePage} of {pageCount}
          </span>
          <button type="button" disabled={activePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
            Next
            <ArrowRight size={16} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
