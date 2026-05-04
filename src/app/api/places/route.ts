import { NextResponse } from "next/server";
import { z } from "zod";

import { searchPlaces } from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = z
      .object({
        q: z.string().trim().min(2)
      })
      .parse({
        q: url.searchParams.get("q")
      });

    const results = await searchPlaces(query.q);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not search places." },
      { status: 400 }
    );
  }
}
