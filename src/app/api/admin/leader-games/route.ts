import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  encodeGameDetails,
  leaderGamesSectionId,
  leaderGamesSectionTitle,
  normalizeGameCategory,
  slugifyGameTitle
} from "@/lib/games-library";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  category: z.string().transform((value) => normalizeGameCategory(value)),
  summary: z.string().trim().min(1),
  content: z.string().trim().min(1),
  groupSize: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  tip: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["open", "closed"]).default("open")
});

function revalidateGames() {
  revalidateTag("games-library");
  revalidatePath("/admin");
  revalidatePath("/leaders");
  revalidatePath("/leaders/games");
}

async function ensureGamesSection() {
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("Supabase admin access is required.");
  }

  const { error } = await adminSupabase.from("leader_resource_sections").upsert(
    {
      id: leaderGamesSectionId,
      title: leaderGamesSectionTitle,
      description: "Hidden source section for editable Games Library entries.",
      display_order: 99,
      published: false,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return adminSupabase;
}

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Super admin access required." }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = schema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    category: formData.get("category"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    groupSize: formData.get("groupSize"),
    duration: formData.get("duration"),
    tip: formData.get("tip"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status")
  });

  if (!payload.success) {
    return NextResponse.json({ message: "Enter all game fields correctly." }, { status: 400 });
  }

  const adminSupabase = await ensureGamesSection();
  const slug = slugifyGameTitle(payload.data.slug || payload.data.title);
  const details = encodeGameDetails({
    id: slug,
    content: payload.data.content,
    groupSize: payload.data.groupSize || "Whole group",
    needs: [],
    steps: [],
    tip: payload.data.tip ?? ""
  });
  const { error } = await adminSupabase.from("leader_resource_items").insert({
    section_id: leaderGamesSectionId,
    title: payload.data.title,
    description: payload.data.summary,
    eyebrow: payload.data.category,
    duration: payload.data.duration || null,
    resource_type: "tool",
    url: details,
    display_order: payload.data.displayOrder,
    published: payload.data.status === "open"
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  revalidateGames();

  return NextResponse.json({ message: "Game added." });
}
