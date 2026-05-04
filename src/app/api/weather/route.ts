import { NextResponse } from "next/server";

import { fetchWeatherForLocation, parseWeatherQuery } from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseWeatherQuery(url);
    const weather = await fetchWeatherForLocation({
      latitude: query.lat,
      longitude: query.lon,
      name: query.name,
      timezone: query.timezone
    });

    return NextResponse.json(weather);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not fetch weather." },
      { status: 400 }
    );
  }
}
