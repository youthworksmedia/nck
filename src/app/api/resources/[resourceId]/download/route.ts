import { NextResponse } from "next/server";

import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

const assetColumns = {
  music: { path: "music_file_path", name: "music_file_name" },
  worksheet: { path: "worksheet_file_path", name: "worksheet_file_name" },
  manual: { path: "manual_file_path", name: "manual_file_name" }
} as const;

export async function GET(request: Request, context: RouteContext) {
  const asset = new URL(request.url).searchParams.get("asset") as keyof typeof assetColumns | null;

  if (!asset || !(asset in assetColumns)) {
    return NextResponse.json({ message: "Choose a valid download asset." }, { status: 400 });
  }

  const [user, membership] = await Promise.all([getCurrentUser(), getMembershipSnapshot()]);

  if (!user || !["active", "trialing"].includes(membership.subscriptionStatus)) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Download service is not ready." }, { status: 400 });
  }

  const { resourceId } = await context.params;
  const { path: pathColumn, name: nameColumn } = assetColumns[asset];

  const { data: resource, error } = await adminSupabase
    .from("resources")
    .select(`id, ${pathColumn}, ${nameColumn}, published`)
    .eq("id", resourceId)
    .eq("published", true)
    .limit(1)
    .maybeSingle();

  if (error || !resource) {
    return NextResponse.json({ message: "Resource not found." }, { status: 404 });
  }

  const filePath = resource[pathColumn as keyof typeof resource] as string | null;
  const fileName = (resource[nameColumn as keyof typeof resource] as string | null) ?? `${asset}.bin`;

  if (!filePath) {
    return NextResponse.json({ message: "This file is not available yet." }, { status: 404 });
  }

  try {
    const storedFile = await downloadStoredResourceFile(filePath, fileName);

    if (!storedFile) {
      return NextResponse.json({ message: "Could not open this file." }, { status: 404 });
    }

    return new NextResponse(Buffer.from(storedFile.bytes), {
      headers: {
        "Content-Type": storedFile.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "Could not open this file." }, { status: 404 });
  }
}
