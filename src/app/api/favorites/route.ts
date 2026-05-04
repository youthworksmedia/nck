import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadFavoriteSummaries } from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase is required." }, { status: 500 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    const maybeUserId = new URL(request.url).searchParams.get("user_id");
    const userId = user?.id ?? maybeUserId;

    if (!userId) {
      return NextResponse.json({ message: "A user is required." }, { status: 401 });
    }

    const favorites = await loadFavoriteSummaries(supabase, userId);
    return NextResponse.json({ favorites });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not load favorites." },
      { status: 400 }
    );
  }
}
