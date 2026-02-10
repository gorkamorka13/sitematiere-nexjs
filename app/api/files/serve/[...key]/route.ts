import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/storage/r2-client";

// export const runtime = 'edge'; // Commenté pour le dev local


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

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    try {
      const response = await r2Client.send(command);

      // Edge Runtime compatible: response.Body is already a Web ReadableStream
      const stream = response.Body as ReadableStream;

      const headers = new Headers();
      if (response.ContentType) {
        headers.set("Content-Type", response.ContentType);
      }
      if (response.ContentLength) {
        headers.set("Content-Length", response.ContentLength.toString());
      }
      // Set caching headers suitable for static assets
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new NextResponse(stream, { headers });

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
