import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const name = url.searchParams.get("name") || "leader-resource.bin";
  const [user, membership, isSuperAdmin] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserSuperAdmin()
  ]);

  if (!user || (!isSuperAdmin && !["active", "trialing"].includes(membership.subscriptionStatus))) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const storedFile = await downloadStoredResourceFile(path, name);

  if (!storedFile) {
    return NextResponse.json({ message: "Resource file not found." }, { status: 404 });
  }

  const responseBytes = await addLicensedFooterToPdf(storedFile.bytes, {
    contentType: storedFile.contentType,
    fileName: name,
    membership
  });

  return new NextResponse(Buffer.from(responseBytes), {
    headers: {
      "Content-Type": storedFile.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
