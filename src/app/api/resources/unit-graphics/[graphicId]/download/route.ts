import { NextResponse } from "next/server";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { downloadStoredResourceFile } from "@/lib/resource-assets";
import { addLicensedFooterToPdf } from "@/lib/resource-pdf-footer";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unitHeroGraphicTitle } from "@/lib/unit-overviews";

type RouteContext = {
  params: Promise<{ graphicId: string }>;
};

async function getAccess() {
  const [user, membership, isSuperAdmin] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserSuperAdmin()
  ]);

  return {
    canDownload: Boolean(user && (isSuperAdmin || ["active", "trialing"].includes(membership.subscriptionStatus))),
    membership
  };
}

export async function GET(request: Request, context: RouteContext) {
  const access = await getAccess();

  if (!access.canDownload) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Download service is not ready." }, { status: 400 });
  }

  const { graphicId } = await context.params;
  const isPreview = new URL(request.url).searchParams.get("preview") === "1";
  const { data: graphic, error } = await adminSupabase
    .from("curriculum_unit_graphics")
    .select("*")
    .eq("id", graphicId)
    .neq("title", unitHeroGraphicTitle)
    .eq("published", true)
    .maybeSingle();

  if (error || !graphic?.file_path) {
    return NextResponse.json({ message: "Graphic not found." }, { status: 404 });
  }

  const fileName = graphic.file_name || `${graphic.title}.bin`;
  const storedFile = await downloadStoredResourceFile(graphic.file_path, fileName);

  if (!storedFile) {
    return NextResponse.json({ message: "Could not open this graphic." }, { status: 404 });
  }

  const responseBytes = await addLicensedFooterToPdf(storedFile.bytes, {
    contentType: storedFile.contentType,
    fileName,
    membership: access.membership,
    enabled: graphic.include_copyright === true
  });

  return new Response(Buffer.from(responseBytes), {
    headers: {
      "Content-Type": storedFile.contentType,
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
