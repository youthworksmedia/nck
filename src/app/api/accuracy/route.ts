import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadAccuracyForLocation, parseAccuracyQuery } from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase is required." }, { status: 500 });
    }

    const { location_id } = parseAccuracyQuery(new URL(request.url));
    const accuracy = await loadAccuracyForLocation(supabase, location_id);

    return NextResponse.json({ locationId: location_id, accuracy });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not compute accuracy." },
      { status: 400 }
    );
  }
}
