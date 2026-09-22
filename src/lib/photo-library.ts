import { cache } from "react";
import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PhotoLibraryImage = {
  id: string;
  dbId?: string;
  title: string;
  description: string;
  imagePath: string;
  fileName: string;
  displayOrder: number;
  status: "open" | "closed";
};

export const leaderPhotosSectionId = "00000000-0000-4000-8000-000000000505";
export const leaderPhotosSectionTitle = "Bible Photos";

const photoBasePath = "/bible-photos";

export const photoLibraryImages: PhotoLibraryImage[] = [
  {
    id: "capernaum",
    title: "Capernaum",
    description: "A lakeside town where Jesus taught and healed during his Galilean ministry.",
    imagePath: `${photoBasePath}/Capernaum.jpeg`,
    fileName: "Capernaum.jpeg",
    displayOrder: 1,
    status: "open"
  },
  {
    id: "garden-of-gethsemane",
    title: "Garden of Gethsemane",
    description: "The garden on the Mount of Olives where Jesus prayed before his arrest.",
    imagePath: `${photoBasePath}/Gesthemene.jpg`,
    fileName: "Gesthemene.jpg",
    displayOrder: 2,
    status: "open"
  },
  {
    id: "mount-of-beatitudes",
    title: "Mount of Beatitudes",
    description: "Traditional hillside setting connected with Jesus' Sermon on the Mount.",
    imagePath: `${photoBasePath}/Beattitudes.jpeg`,
    fileName: "Beattitudes.jpeg",
    displayOrder: 3,
    status: "open"
  },
  {
    id: "qumran-caves",
    title: "Qumran Caves",
    description: "Desert caves near the Dead Sea associated with the discovery of the Dead Sea Scrolls.",
    imagePath: `${photoBasePath}/Qumran Caves.jpeg`,
    fileName: "Qumran Caves.jpeg",
    displayOrder: 4,
    status: "open"
  },
  {
    id: "sea-of-galilee",
    title: "Sea of Galilee",
    description: "The freshwater lake where many Gospel events around Jesus' ministry took place.",
    imagePath: `${photoBasePath}/Sea of Galilee.jpeg`,
    fileName: "Sea of Galilee.jpeg",
    displayOrder: 5,
    status: "open"
  },
  {
    id: "library-of-celsus-ephesus",
    title: "Library of Celsus, Ephesus",
    description: "A famous Roman-era library facade in ancient Ephesus.",
    imagePath: `${photoBasePath}/Ephesus Library.jpg`,
    fileName: "Ephesus Library.jpg",
    displayOrder: 6,
    status: "open"
  },
  {
    id: "roman-colosseum",
    title: "Roman Colosseum",
    description: "A major amphitheatre in Rome from the world of the early church.",
    imagePath: `${photoBasePath}/Roman Colosseum.jpg`,
    fileName: "Roman Colosseum.jpg",
    displayOrder: 7,
    status: "open"
  },
  {
    id: "pool-of-bethesda",
    title: "Pool of Bethesda",
    description: "Jerusalem pools associated with Jesus healing a man in John's Gospel.",
    imagePath: `${photoBasePath}/Pool of Bethsaida.jpg`,
    fileName: "Pool of Bethsaida.jpg",
    displayOrder: 8,
    status: "open"
  },
  {
    id: "qumran-caves-view",
    title: "Qumran Caves View",
    description: "Another view of the caves and cliffs around Qumran.",
    imagePath: `${photoBasePath}/More Qumran Caves.jpg`,
    fileName: "More Qumran Caves.jpg",
    displayOrder: 9,
    status: "open"
  },
  {
    id: "sea-of-galilee-shore",
    title: "Sea of Galilee Shore",
    description: "A shoreline view of the lake known from the Gospel accounts.",
    imagePath: `${photoBasePath}/Sea of Galilee (1).jpeg`,
    fileName: "Sea of Galilee (1).jpeg",
    displayOrder: 10,
    status: "open"
  },
  {
    id: "jerusalem-city-gate",
    title: "Jerusalem City Gate",
    description: "A stone gateway into Jerusalem, useful for teaching Bible city settings.",
    imagePath: `${photoBasePath}/Jerusalem City Gate.jpeg`,
    fileName: "Jerusalem City Gate.jpeg",
    displayOrder: 11,
    status: "open"
  },
  {
    id: "ephesian-amphitheatre",
    title: "Ephesian Amphitheatre",
    description: "The large theatre at Ephesus connected with the events of Acts 19.",
    imagePath: `${photoBasePath}/Ephesian Ampitheatre.jpeg`,
    fileName: "Ephesian Ampitheatre.jpeg",
    displayOrder: 12,
    status: "open"
  },
  {
    id: "ephesian-market-stall",
    title: "Ephesian Market Stall",
    description: "Ancient marketplace remains from Ephesus, giving context for daily life.",
    imagePath: `${photoBasePath}/Ephesian Market Stall.jpeg`,
    fileName: "Ephesian Market Stall.jpeg",
    displayOrder: 13,
    status: "open"
  },
  {
    id: "outside-roman-colosseum",
    title: "Outside the Roman Colosseum",
    description: "Exterior view of the Colosseum in Rome.",
    imagePath: `${photoBasePath}/Outside Roman Colosseum.jpg`,
    fileName: "Outside Roman Colosseum.jpg",
    displayOrder: 14,
    status: "open"
  },
  {
    id: "jerusalem-model",
    title: "City of Jerusalem Model",
    description: "A model view of Jerusalem, helpful for locating temple-era landmarks.",
    imagePath: `${photoBasePath}/City of Jerusalem Model.jpeg`,
    fileName: "City of Jerusalem Model.jpeg",
    displayOrder: 15,
    status: "open"
  },
  {
    id: "sea-of-galilee-with-boat",
    title: "Sea of Galilee with Boat",
    description: "A Galilee lake view with a boat, useful for Gospel stories on the water.",
    imagePath: `${photoBasePath}/Sea of Galilee with boat.jpeg`,
    fileName: "Sea of Galilee with boat.jpeg",
    displayOrder: 16,
    status: "open"
  },
  {
    id: "mount-of-transfiguration",
    title: "Mount of Transfiguration",
    description: "Traditional mountain setting associated with Jesus' transfiguration.",
    imagePath: `${photoBasePath}/Transfiguration Mountain.jpeg`,
    fileName: "Transfiguration Mountain.jpeg",
    displayOrder: 17,
    status: "open"
  },
  {
    id: "wilderness-of-jesus",
    title: "Wilderness of Jesus",
    description: "Desert wilderness scenery connected with Jesus' forty days of testing.",
    imagePath: `${photoBasePath}/The wilderness Jesus 40 days.jpeg`,
    fileName: "The wilderness Jesus 40 days.jpeg",
    displayOrder: 18,
    status: "open"
  },
  {
    id: "mary-and-elizabeth-meeting-place",
    title: "Mary and Elizabeth Meeting Place",
    description: "A traditional setting linked with Mary's visit to Elizabeth in Luke 1.",
    imagePath: `${photoBasePath}/Mary and Elizabeth meeting place.jpeg`,
    fileName: "Mary and Elizabeth meeting place.jpeg",
    displayOrder: 19,
    status: "open"
  },
  {
    id: "mount-of-olives-towards-mount-annan",
    title: "Mount of Olives Towards Mount Annan",
    description: "A Mount of Olives view across the surrounding hills.",
    imagePath: `${photoBasePath}/Mount of Olives towards Mount Annan.jpg`,
    fileName: "Mount of Olives towards Mount Annan.jpg",
    displayOrder: 20,
    status: "open"
  },
  {
    id: "mount-of-olives-towards-jerusalem",
    title: "Mount of Olives Towards Jerusalem",
    description: "A view from the Mount of Olives towards Jerusalem city.",
    imagePath: `${photoBasePath}/Mount of Olives towards Jerusalem City.jpeg`,
    fileName: "Mount of Olives towards Jerusalem City.jpeg",
    displayOrder: 21,
    status: "open"
  }
];

export function slugifyPhotoTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "photo";
}

export function encodePhotoDetails(photo: Pick<PhotoLibraryImage, "id" | "imagePath" | "fileName">) {
  return JSON.stringify({
    slug: photo.id,
    imagePath: photo.imagePath,
    fileName: photo.fileName
  });
}

function parsePhotoDetails(rawValue: unknown, fallbackSlug: string, fallbackImagePath: string | null, fallbackFileName: string | null) {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return {
      slug: fallbackSlug,
      imagePath: fallbackImagePath ?? "",
      fileName: fallbackFileName ?? ""
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;

    return {
      slug: typeof parsed.slug === "string" && parsed.slug.trim() ? parsed.slug : fallbackSlug,
      imagePath: typeof parsed.imagePath === "string" ? parsed.imagePath : fallbackImagePath ?? "",
      fileName: typeof parsed.fileName === "string" ? parsed.fileName : fallbackFileName ?? ""
    };
  } catch {
    return {
      slug: fallbackSlug,
      imagePath: fallbackImagePath ?? rawValue,
      fileName: fallbackFileName ?? ""
    };
  }
}

function mapPhotoRow(row: Record<string, unknown>): PhotoLibraryImage {
  const title = String(row.title ?? "");
  const fallbackSlug = slugifyPhotoTitle(title);
  const filePath = typeof row.file_path === "string" ? row.file_path : null;
  const fileName = typeof row.file_name === "string" ? row.file_name : null;
  const details = parsePhotoDetails(row.url, fallbackSlug, filePath, fileName);

  return {
    id: details.slug,
    dbId: String(row.id),
    title,
    description: String(row.description ?? ""),
    imagePath: details.imagePath,
    fileName: details.fileName || details.imagePath.split("/").pop() || title,
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

export const getAdminPhotos = cache(async function getAdminPhotos(): Promise<PhotoLibraryImage[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return photoLibraryImages;
  }

  const { data, error } = await adminSupabase
    .from("leader_resource_items")
    .select("*")
    .eq("section_id", leaderPhotosSectionId)
    .order("display_order", { ascending: true });

  if (error || !data?.length) {
    return photoLibraryImages;
  }

  return data.map((row) => mapPhotoRow(row as Record<string, unknown>));
});

export async function getPublishedPhotos() {
  return getCachedPublishedPhotos();
}

const getCachedPublishedPhotos = unstable_cache(
  async function getCachedPublishedPhotos() {
    const photos = await getAdminPhotos();

    return photos
      .filter((photo) => photo.status === "open")
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
  ["published-photo-library"],
  {
    revalidate: 300,
    tags: ["photo-library"]
  }
);

export async function getPhotoById(id: string) {
  const photos = await getPublishedPhotos();

  return photos.find((photo) => photo.id === id) ?? null;
}
