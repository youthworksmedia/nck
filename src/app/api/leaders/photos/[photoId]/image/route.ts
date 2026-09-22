import { NextResponse } from "next/server";

import { getPhotoById } from "@/lib/photo-library";
import { getCurrentUser, getMembershipSnapshot } from "@/lib/portal";
import { downloadStoredResourceFile } from "@/lib/resource-assets";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ photoId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const [user, membership] = await Promise.all([getCurrentUser(), getMembershipSnapshot()]);

  if (!user || !["active", "trialing"].includes(membership.subscriptionStatus)) {
    return NextResponse.json({ message: "Active membership required." }, { status: 403 });
  }

  const { photoId } = await context.params;
  const photo = await getPhotoById(photoId);

  if (!photo) {
    return NextResponse.json({ message: "Photo not found." }, { status: 404 });
  }

  if (photo.filePath.startsWith("/")) {
    return NextResponse.redirect(new URL(photo.filePath, request.url));
  }

  const storedFile = await downloadStoredResourceFile(photo.filePath, photo.fileName);

  if (!storedFile) {
    return NextResponse.json({ message: "Could not open this image." }, { status: 404 });
  }

  const wantsDownload = new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(Buffer.from(storedFile.bytes), {
    headers: {
      "Content-Type": storedFile.contentType,
      "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(photo.fileName)}"`,
      "Cache-Control": "private, max-age=300"
    }
  });
}
