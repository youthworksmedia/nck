import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureWeatherUser,
  parseLocationInput,
  resolveFavoriteLocationName
} from "@/lib/weather";

export async function POST(request: Request) {
  try {
    const payload = parseLocationInput(await request.json());
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase is required." }, { status: 500 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = payload.userId ?? user?.id;

    if (!userId) {
      return NextResponse.json({ message: "Sign in before saving favorites." }, { status: 401 });
    }

    await ensureWeatherUser(supabase, userId, user?.email);

    const { data: existingLocation } = await supabase
      .from("locations")
      .select("id, name, latitude, longitude, favorited, user_id, created_at")
      .eq("user_id", userId)
      .eq("latitude", payload.latitude)
      .eq("longitude", payload.longitude)
      .maybeSingle();

    if (existingLocation) {
      return NextResponse.json({ location: existingLocation }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({
        name: resolveFavoriteLocationName(payload.name, payload.latitude, payload.longitude),
        latitude: payload.latitude,
        longitude: payload.longitude,
        favorited: true,
        user_id: userId
      })
      .select("id, name, latitude, longitude, favorited, user_id, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ location: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not save favorite." },
      { status: 400 }
    );
  }
}
