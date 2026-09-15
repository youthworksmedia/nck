import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getCurrentUser, getMembershipSnapshot, isCurrentUserOwner } from "@/lib/portal";
import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const [user, membership, isOwner, isSuperAdmin] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserOwner(),
    isCurrentUserSuperAdmin()
  ]);

  if (
    !user ||
    (!isSuperAdmin && (!isOwner || !["active", "trialing"].includes(membership.subscriptionStatus)))
  ) {
    return NextResponse.json({ message: "Account holder access required." }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Download service is not ready." }, { status: 400 });
  }

  const { itemId } = await context.params;
  const { data: item, error } = await adminSupabase
    .from("ministry_leader_resource_items")
    .select("title, file_path, file_name, published")
    .eq("id", itemId)
    .eq("published", true)
    .limit(1)
    .maybeSingle();

  if (error || !item?.file_path) {
    return NextResponse.json({ message: "Resource file not found." }, { status: 404 });
  }

  const fileName = item.file_name || `${item.title}.bin`;
  const storedFile = await downloadStoredResourceFile(item.file_path, fileName);

  if (!storedFile) {
    return NextResponse.json({ message: "Could not open this file." }, { status: 404 });
  }

  const responseBytes = await addLicensedFooterToPdf(storedFile.bytes, {
    contentType: storedFile.contentType,
    fileName,
    membership
  });

  return new NextResponse(Buffer.from(responseBytes), {
    headers: {
      "Content-Type": storedFile.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
