import { NextResponse } from "next/server";

import { markDashboardSeen } from "@/lib/dashboard-state";
import { getCurrentUser } from "@/lib/portal";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Login required." }, { status: 401 });
  }

  await markDashboardSeen();

  return NextResponse.json({ ok: true });
}
