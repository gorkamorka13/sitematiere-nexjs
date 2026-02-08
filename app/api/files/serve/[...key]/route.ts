import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/storage/r2-client";
import { Readable } from "stream";

// Helper to convert Node.js Readable stream to Web ReadableStream
function streamToWeb(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const fileKey = key.join("/");

    if (!fileKey) {
      return NextResponse.json({ error: "File key is required" }, { status: 400 });
    }

    // Decoding might be needed if the browser sends encoded slashes,
    // but Next.js usually handles [...key] decoding appropriately.
    // However, verify if double encoding happens.

    // For now, assume proper key.

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    try {
      const response = await r2Client.send(command);

      const stream = response.Body as Readable;
      const webStream = streamToWeb(stream);

      const headers = new Headers();
      if (response.ContentType) {
        headers.set("Content-Type", response.ContentType);
      }
      if (response.ContentLength) {
        headers.set("Content-Length", response.ContentLength.toString());
      }
      // Set caching headers suitable for static assets
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new NextResponse(webStream as any, { headers });

    } catch (error: any) {
      if (error.name === "NoSuchKey") {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
