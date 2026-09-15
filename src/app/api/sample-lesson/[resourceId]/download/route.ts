import { NextResponse } from "next/server";

import { getPublicSampleResource } from "@/lib/public-resources";
import { downloadStoredResourceFile } from "@/lib/resource-assets";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { resourceId } = await context.params;
  const sampleResource = await getPublicSampleResource();

  if (!sampleResource || sampleResource.id !== resourceId) {
    return NextResponse.json({ message: "Sample resource not found." }, { status: 404 });
  }

  const asset = new URL(request.url).searchParams.get("asset");

  if (!asset) {
    return NextResponse.json({ message: "Choose a valid download asset." }, { status: 400 });
  }

  const attachment = sampleResource.attachments?.find((entry) => entry.id === asset);
  const filePath = attachment?.filePath ?? null;
  const fileName = attachment?.fileName ?? attachment?.name ?? "sample-resource.bin";

  if (!filePath) {
    return NextResponse.json({ message: "This sample file is not available yet." }, { status: 404 });
  }

  try {
    const storedFile = await downloadStoredResourceFile(filePath, fileName);

    if (!storedFile) {
      return NextResponse.json({ message: "Could not open this sample file." }, { status: 404 });
    }

    return new NextResponse(Buffer.from(storedFile.bytes), {
      headers: {
        "Content-Type": storedFile.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch {
    return NextResponse.json({ message: "Could not open this sample file." }, { status: 404 });
  }
}
