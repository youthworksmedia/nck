import { NextResponse } from "next/server";

import { trackLastAccessedResource } from "@/lib/dashboard-state";
import { getCurrentUser } from "@/lib/portal";
import { getPublicResources } from "@/lib/public-resources";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Login required." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { resourceId?: unknown } | null;
  const resourceId = typeof payload?.resourceId === "string" ? payload.resourceId : "";

  if (!resourceId) {
    return NextResponse.json({ message: "Resource id is required." }, { status: 400 });
  }

  const resources = await getPublicResources();
  const resource = resources.find((entry) => entry.id === resourceId);

  if (!resource) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }

  await trackLastAccessedResource(resource.id);

  return NextResponse.json({ ok: true });
}
