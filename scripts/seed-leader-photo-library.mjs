import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env.local", import.meta.url);

try {
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2];
  }
} catch {
  // The deployment environment can provide these values directly.
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const leaderPhotosSectionId = "00000000-0000-4000-8000-000000000505";
const photoBasePath = "/bible-photos";

const photos = [
  ["capernaum", "Capernaum", "A lakeside town where Jesus taught and healed during his Galilean ministry.", "Capernaum.jpeg"],
  ["garden-of-gethsemane", "Garden of Gethsemane", "The garden on the Mount of Olives where Jesus prayed before his arrest.", "Gesthemene.jpg"],
  ["mount-of-beatitudes", "Mount of Beatitudes", "Traditional hillside setting connected with Jesus' Sermon on the Mount.", "Beattitudes.jpeg"],
  ["qumran-caves", "Qumran Caves", "Desert caves near the Dead Sea associated with the discovery of the Dead Sea Scrolls.", "Qumran Caves.jpeg"],
  ["sea-of-galilee", "Sea of Galilee", "The freshwater lake where many Gospel events around Jesus' ministry took place.", "Sea of Galilee.jpeg"],
  ["library-of-celsus-ephesus", "Library of Celsus, Ephesus", "A famous Roman-era library facade in ancient Ephesus.", "Ephesus Library.jpg"],
  ["roman-colosseum", "Roman Colosseum", "A major amphitheatre in Rome from the world of the early church.", "Roman Colosseum.jpg"],
  ["pool-of-bethesda", "Pool of Bethesda", "Jerusalem pools associated with Jesus healing a man in John's Gospel.", "Pool of Bethsaida.jpg"],
  ["qumran-caves-view", "Qumran Caves View", "Another view of the caves and cliffs around Qumran.", "More Qumran Caves.jpg"],
  ["sea-of-galilee-shore", "Sea of Galilee Shore", "A shoreline view of the lake known from the Gospel accounts.", "Sea of Galilee (1).jpeg"],
  ["jerusalem-city-gate", "Jerusalem City Gate", "A stone gateway into Jerusalem, useful for teaching Bible city settings.", "Jerusalem City Gate.jpeg"],
  ["ephesian-amphitheatre", "Ephesian Amphitheatre", "The large theatre at Ephesus connected with the events of Acts 19.", "Ephesian Ampitheatre.jpeg"],
  ["ephesian-market-stall", "Ephesian Market Stall", "Ancient marketplace remains from Ephesus, giving context for daily life.", "Ephesian Market Stall.jpeg"],
  ["outside-roman-colosseum", "Outside the Roman Colosseum", "Exterior view of the Colosseum in Rome.", "Outside Roman Colosseum.jpg"],
  ["jerusalem-model", "City of Jerusalem Model", "A model view of Jerusalem, helpful for locating temple-era landmarks.", "City of Jerusalem Model.jpeg"],
  ["sea-of-galilee-with-boat", "Sea of Galilee with Boat", "A Galilee lake view with a boat, useful for Gospel stories on the water.", "Sea of Galilee with boat.jpeg"],
  ["mount-of-transfiguration", "Mount of Transfiguration", "Traditional mountain setting associated with Jesus' transfiguration.", "Transfiguration Mountain.jpeg"],
  ["wilderness-of-jesus", "Wilderness of Jesus", "Desert wilderness scenery connected with Jesus' forty days of testing.", "The wilderness Jesus 40 days.jpeg"],
  ["mary-and-elizabeth-meeting-place", "Mary and Elizabeth Meeting Place", "A traditional setting linked with Mary's visit to Elizabeth in Luke 1.", "Mary and Elizabeth meeting place.jpeg"],
  ["mount-of-olives-towards-mount-annan", "Mount of Olives Towards Mount Annan", "A Mount of Olives view across the surrounding hills.", "Mount of Olives towards Mount Annan.jpg"],
  ["mount-of-olives-towards-jerusalem", "Mount of Olives Towards Jerusalem", "A view from the Mount of Olives towards Jerusalem city.", "Mount of Olives towards Jerusalem City.jpeg"]
];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: "nck" },
  auth: { autoRefreshToken: false, persistSession: false }
});

const now = new Date().toISOString();
const { error: sectionError } = await supabase.from("leader_resource_sections").upsert(
  {
    id: leaderPhotosSectionId,
    title: "Bible Photos",
    description: "Hidden source section for editable Image Library entries.",
    display_order: 98,
    published: false,
    updated_at: now
  },
  { onConflict: "id" }
);

if (sectionError) {
  throw new Error(sectionError.message);
}

const { data: existingRows, error: existingError } = await supabase
  .from("leader_resource_items")
  .select("id,url")
  .eq("section_id", leaderPhotosSectionId);

if (existingError) {
  throw new Error(existingError.message);
}

const existingBySlug = new Map();
for (const row of existingRows ?? []) {
  try {
    const details = JSON.parse(row.url ?? "{}");
    if (typeof details.slug === "string") existingBySlug.set(details.slug, row.id);
  } catch {
    // Ignore non-JSON legacy rows.
  }
}

let inserted = 0;
let updated = 0;

for (const [index, [slug, title, description, fileName]] of photos.entries()) {
  const imagePath = `${photoBasePath}/${fileName}`;
  const payload = {
    section_id: leaderPhotosSectionId,
    title,
    description,
    eyebrow: "Image",
    resource_type: "tool",
    url: JSON.stringify({ slug, imagePath, fileName }),
    file_path: imagePath,
    file_name: fileName,
    display_order: index + 1,
    published: true,
    updated_at: now
  };
  const existingId = existingBySlug.get(slug);
  const query = existingId
    ? supabase.from("leader_resource_items").update(payload).eq("id", existingId)
    : supabase.from("leader_resource_items").insert(payload);
  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (existingId) updated += 1;
  else inserted += 1;
}

console.log(`Seeded Image Library photos: ${inserted} inserted, ${updated} updated.`);
