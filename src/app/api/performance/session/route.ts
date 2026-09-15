import { NextResponse } from "next/server";

import { getPerformanceSessionAccess } from "@/lib/performance-logs";
import { startTimer } from "@/lib/timing";

export async function GET() {
  const timer = startTimer("route.handler", "api.performance.session.get");

  try {
    const session = await getPerformanceSessionAccess();
    return NextResponse.json(session, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } finally {
    console.timeEnd(timer);
  }
}
