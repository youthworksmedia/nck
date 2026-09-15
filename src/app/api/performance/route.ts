import { NextResponse } from "next/server";

import { insertPerformanceLog } from "@/lib/performance-logs";
import { startTimer } from "@/lib/timing";

export async function POST(request: Request) {
  const timer = startTimer("route.handler", "api.performance.post");

  try {
    const body = await request.json();
    await insertPerformanceLog({
      durationMs: Number(body?.durationMs),
      eventType: body?.eventType === "initial_load" ? "initial_load" : "client_navigation",
      finalPath: typeof body?.finalPath === "string" ? body.finalPath : "/",
      sourcePath: typeof body?.sourcePath === "string" ? body.sourcePath : null,
      targetPath: typeof body?.targetPath === "string" ? body.targetPath : null,
      ttfbMs: typeof body?.ttfbMs === "number" ? body.ttfbMs : null,
      domCompleteMs: typeof body?.domCompleteMs === "number" ? body.domCompleteMs : null,
      windowLoadedMs: typeof body?.windowLoadedMs === "number" ? body.windowLoadedMs : null,
      viewportWidth: typeof body?.viewportWidth === "number" ? body.viewportWidth : null,
      viewportHeight: typeof body?.viewportHeight === "number" ? body.viewportHeight : null
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Could not log performance." },
      { status: 500 }
    );
  } finally {
    console.timeEnd(timer);
  }
}
