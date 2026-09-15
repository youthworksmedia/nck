import { cache } from "react";
import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GameCategory = "Kindergarten-Year 6" | "Kindergarten-Year 2" | "Year 3-6";

export type GamesLibraryGame = {
  id: string;
  dbId?: string;
  title: string;
  category: GameCategory;
  summary: string;
  content?: string;
  groupSize: string;
  duration: string;
  needs: string[];
  steps: string[];
  tip: string;
  displayOrder: number;
  status: "open" | "closed";
};

export const gameCategories: GameCategory[] = ["Kindergarten-Year 6", "Kindergarten-Year 2", "Year 3-6"];
export const leaderGamesSectionId = "00000000-0000-4000-8000-000000000504";
export const leaderGamesSectionTitle = "Games";

export const gamesLibraryGames: GamesLibraryGame[] = [
  {
    id: "stuck-in-the-mud",
    title: "Stuck in the Mud",
    category: "Kindergarten-Year 6",
    summary: "A classic tag variant - tagged players freeze until a teammate frees them.",
    groupSize: "Whole group",
    duration: "10-15 min",
    needs: ["A large open space (indoors or outside).", "1-2 players chosen as taggers."],
    steps: [
      "Choose one or two taggers. Everyone else spreads out across the space.",
      "On go, taggers chase the other players. Anyone tagged must freeze on the spot with legs apart.",
      "Free players can release a frozen player by crawling through their legs or tagging their hand.",
      "Play for a set time, then rotate taggers. See how long the group can last before everyone is stuck at once."
    ],
    tip: "Set clear boundaries before you start so the chase stays contained.",
    displayOrder: 1,
    status: "open"
  },
  {
    id: "blindfold-games-steal-the-keys",
    title: "Blindfold Games (Steal the Keys)",
    category: "Kindergarten-Year 6",
    summary: "A blindfolded guard tries to protect a set of keys from being stolen.",
    groupSize: "Small groups",
    duration: "10 min",
    needs: ["Keys or another small noisy object.", "A blindfold.", "A quiet play space."],
    steps: [
      "Choose one player to sit blindfolded in the centre with the keys beside them.",
      "One player at a time quietly approaches and tries to take the keys without being heard.",
      "If the guard points to the player or tags them, that player returns to the group.",
      "If the keys are stolen successfully, choose a new guard and play again."
    ],
    tip: "Remind children that slow, careful movement is the aim - not rushing.",
    displayOrder: 2,
    status: "open"
  },
  {
    id: "simple-obstacle-course",
    title: "Simple Obstacle Course",
    category: "Kindergarten-Year 6",
    summary: "A course built from whatever furniture or equipment is on hand - indoors or outside.",
    groupSize: "Whole group",
    duration: "15-20 min",
    needs: ["Chairs, cones, hoops, cushions, ropes, or other safe objects.", "A clear start and finish line."],
    steps: [
      "Create a short course with climbing, crawling, balancing, weaving, or stepping sections.",
      "Walk the group through the route before anyone begins.",
      "Send children through one at a time or in small groups.",
      "Repeat the course, changing one challenge each round to keep it fresh."
    ],
    tip: "Keep the course simple enough that every child can complete it safely.",
    displayOrder: 3,
    status: "open"
  },
  {
    id: "gospel-captains-coming",
    title: "Gospel Version of Captain's Coming",
    category: "Kindergarten-Year 6",
    summary: "The classic action-command game, adapted with Bible/gospel-themed actions.",
    groupSize: "Whole group",
    duration: "10-15 min",
    needs: ["A list of actions and commands.", "An open play area."],
    steps: [
      "Teach the group each command and matching action before the round begins.",
      "Call commands quickly and have children respond with the right action.",
      "Add gospel-themed commands such as pray, listen, share, help, or follow.",
      "Keep the pace playful and restart whenever the group needs a reset."
    ],
    tip: "Use commands connected to the lesson so the game reinforces the teaching naturally.",
    displayOrder: 4,
    status: "open"
  },
  {
    id: "musical-statues",
    title: "Musical Statues",
    category: "Kindergarten-Year 2",
    summary: "Dance while the music plays, freeze the instant it stops.",
    groupSize: "Whole group",
    duration: "10 min",
    needs: ["Music player."],
    steps: [
      "Play music and have the kids dance freely around the space.",
      "Stop the music without warning - everyone must freeze instantly like a statue.",
      "Anyone who moves after the music stops sits out for that round, or does a silly pose and stays in for younger groups.",
      "Keep playing rounds until you have one or two winners."
    ],
    tip: "For younger kids, skip eliminations and just make it a fun freeze game - everyone stays in.",
    displayOrder: 5,
    status: "open"
  },
  {
    id: "hot-cold-game",
    title: "Hot / Cold Game",
    category: "Kindergarten-Year 2",
    summary: "Guide a seeker to a hidden object using only hot and cold clues.",
    groupSize: "Whole group or small group",
    duration: "5-10 min",
    needs: ["A small object to hide.", "A room or defined play area."],
    steps: [
      "Choose one child to be the seeker and ask them to close their eyes or step aside.",
      "Hide the object somewhere safe and visible enough to find.",
      "The group calls colder when the seeker moves away and hotter when they move closer.",
      "Celebrate when the object is found, then choose a new seeker."
    ],
    tip: "Use warm, warmer, hot, and very hot to help younger children understand the clues.",
    displayOrder: 6,
    status: "open"
  },
  {
    id: "parachute-play",
    title: "Parachute Play",
    category: "Kindergarten-Year 2",
    summary: "Classic play parachute games - great for energy and group coordination.",
    groupSize: "Whole group",
    duration: "10-15 min",
    needs: ["A play parachute or large sheet.", "Soft balls or beanbags if available."],
    steps: [
      "Have children stand around the parachute and hold the edge with both hands.",
      "Practise lifting it up, lowering it down, and making small and big waves.",
      "Add a soft ball and work together to keep it bouncing without falling off.",
      "Finish with a calm round where everyone slowly lifts and lowers together."
    ],
    tip: "Give clear stop and go signals so the group stays coordinated.",
    displayOrder: 7,
    status: "open"
  },
  {
    id: "metal-puzzles",
    title: "Metal Puzzles",
    category: "Year 3-6",
    summary: "Interlocking metal puzzle pieces that must be worked free from each other through a specific sequence of moves.",
    groupSize: "Individual / pairs",
    duration: "5-10 min per puzzle",
    needs: ["Metal puzzles or similar brain-teaser puzzles.", "A table or quiet area."],
    steps: [
      "Give each child or pair one puzzle to solve.",
      "Explain that the aim is patience and careful problem-solving, not force.",
      "Let children work for a set time before swapping puzzles.",
      "Invite children who solve one to coach others without giving the answer away immediately."
    ],
    tip: "This works well as an arrival activity while children are settling in.",
    displayOrder: 8,
    status: "open"
  },
  {
    id: "fresh",
    title: "Fresh",
    category: "Year 3-6",
    summary: "An active, high-energy game well suited to this age group.",
    groupSize: "Whole group",
    duration: "10-15 min",
    needs: ["An open play area.", "Clear boundary markers."],
    steps: [
      "Divide players into two even teams and mark a home line for each team.",
      "Players may chase opponents who entered the field before them, but can be tagged by anyone newer or fresh.",
      "Tagged players return to their home line before rejoining.",
      "Play for a set time and encourage teams to use timing and teamwork."
    ],
    tip: "Run a slow demonstration first; the fresh-player rule makes much more sense once children see it.",
    displayOrder: 9,
    status: "open"
  },
  {
    id: "celebrity-heads",
    title: "Celebrity Heads",
    category: "Year 3-6",
    summary: "Guess the Bible character stuck to your forehead by asking yes/no questions - using characters from Luke and other familiar Bible passages.",
    groupSize: "Whole group or teams",
    duration: "10-15 min",
    needs: ["Sticky notes or cards.", "Bible character names."],
    steps: [
      "Write a Bible character on a sticky note and place it where the player cannot see it.",
      "The player asks yes/no questions to work out who they are.",
      "The group answers honestly without giving extra clues.",
      "Once guessed, choose a new player or keep several players guessing at once."
    ],
    tip: "Prepare a mix of easy and harder characters so every child can join in confidently.",
    displayOrder: 10,
    status: "open"
  },
  {
    id: "laurie",
    title: "Laurie",
    category: "Year 3-6",
    summary: "A revision game for reviewing what the group has learned across the term.",
    groupSize: "Whole group or teams",
    duration: "10-15 min",
    needs: ["Revision questions.", "A scoreboard if playing in teams."],
    steps: [
      "Prepare questions from recent lessons, memory verses, and key ideas.",
      "Divide the group into teams or play as one large circle.",
      "Ask a question and let players answer individually or confer as a team.",
      "Award points for correct answers and add bonus points for explaining the answer clearly."
    ],
    tip: "Mix quick recall questions with a few deeper why questions to reinforce understanding.",
    displayOrder: 11,
    status: "open"
  }
];

export function slugifyGameTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "game";
}

export function normalizeGameCategory(value?: string | null): GameCategory {
  return gameCategories.includes(value as GameCategory) ? (value as GameCategory) : "Kindergarten-Year 6";
}

export function encodeGameDetails(
  game: Pick<GamesLibraryGame, "id" | "groupSize" | "needs" | "steps" | "tip"> & { content?: string }
) {
  return JSON.stringify({
    slug: game.id,
    content: game.content ?? "",
    groupSize: game.groupSize,
    needs: game.needs,
    steps: game.steps,
    tip: game.tip
  });
}

function parseLines(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  }

  return [];
}

function parseGameDetails(rawValue: unknown, fallbackSlug: string) {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return {
      slug: fallbackSlug,
      content: "",
      groupSize: "",
      needs: [],
      steps: [],
      tip: ""
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;

    return {
      slug: typeof parsed.slug === "string" && parsed.slug.trim() ? parsed.slug : fallbackSlug,
      content: typeof parsed.content === "string" ? parsed.content : "",
      groupSize: typeof parsed.groupSize === "string" ? parsed.groupSize : "",
      needs: parseLines(parsed.needs),
      steps: parseLines(parsed.steps),
      tip: typeof parsed.tip === "string" ? parsed.tip : ""
    };
  } catch {
    return {
      slug: fallbackSlug,
      content: "",
      groupSize: "",
      needs: [],
      steps: [],
      tip: ""
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function legacyGameContent(game: Pick<GamesLibraryGame, "summary" | "needs" | "steps" | "tip">) {
  const parts: string[] = [];

  if (game.summary.trim()) {
    parts.push(`<p>${escapeHtml(game.summary)}</p>`);
  }

  if (game.needs.length) {
    parts.push("<h2>What you'll need</h2>");
    parts.push(`<ul>${game.needs.map((need) => `<li>${escapeHtml(need)}</li>`).join("")}</ul>`);
  }

  if (game.steps.length) {
    parts.push("<h2>How to play</h2>");
    parts.push(`<ol>${game.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`);
  }

  return parts.join("");
}

function mapGameRow(row: Record<string, unknown>): GamesLibraryGame {
  const title = String(row.title ?? "");
  const fallbackSlug = slugifyGameTitle(title);
  const details = parseGameDetails(row.url, fallbackSlug);
  const summary = String(row.description ?? "");

  return {
    id: details.slug,
    dbId: String(row.id),
    title,
    category: normalizeGameCategory(String(row.eyebrow ?? "")),
    summary,
    content: details.content || legacyGameContent({ summary, needs: details.needs, steps: details.steps, tip: details.tip }),
    groupSize: details.groupSize || "Whole group",
    duration: typeof row.duration === "string" && row.duration ? row.duration : "10 min",
    needs: details.needs,
    steps: details.steps,
    tip: details.tip,
    displayOrder: Number(row.display_order ?? 0),
    status: row.published === false ? "closed" : "open"
  };
}

export const getAdminGames = cache(async function getAdminGames(): Promise<GamesLibraryGame[]> {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return gamesLibraryGames.map((game) => ({ ...game, content: game.content || legacyGameContent(game) }));
  }

  const { data, error } = await adminSupabase
    .from("leader_resource_items")
    .select("*")
    .eq("section_id", leaderGamesSectionId)
    .order("display_order", { ascending: true });

  if (error || !data?.length) {
    return gamesLibraryGames.map((game) => ({ ...game, content: game.content || legacyGameContent(game) }));
  }

  return data.map((row) => mapGameRow(row as Record<string, unknown>));
});

export async function getPublishedGames() {
  return getCachedPublishedGames();
}

const getCachedPublishedGames = unstable_cache(
  async function getCachedPublishedGames() {
    const games = await getAdminGames();

    return games
      .filter((game) => game.status === "open")
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
  ["published-games-library"],
  {
    revalidate: 300,
    tags: ["games-library"]
  }
);

export async function getGameById(id: string) {
  const games = await getPublishedGames();

  return games.find((game) => game.id === id) ?? null;
}
