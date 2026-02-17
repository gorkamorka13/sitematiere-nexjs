import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/storage/r2-client";
import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/enums";

export const runtime = 'edge';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const fileKey = key.join("/");

    // Authentification et autorisation
    const session = await auth();
    const userRole = session?.user?.role || UserRole.VISITOR;

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (r2Client as any).send(command);

      const contentType = response.ContentType || "";
      const isPdf = contentType.toLowerCase() === "application/pdf";

      // Restriction : Les visiteurs (ou non-connectés) ne peuvent pas lire les PDFs
      if (isPdf && userRole === UserRole.VISITOR) {
        return NextResponse.json({ error: "Accès refusé. Les plans ne sont pas accessibles aux visiteurs." }, { status: 403 });
      }

      // Edge Runtime compatible: response.Body is already a Web ReadableStream
      const stream = response.Body as ReadableStream;

      const { searchParams } = new URL(request.url);
      const isDownload = searchParams.get("download") === "true";
      const fileName = searchParams.get("filename") || fileKey.split("/").pop();

      const headers = new Headers();
      if (response.ContentType) {
        headers.set("Content-Type", response.ContentType);
      }
      if (response.ContentLength) {
        headers.set("Content-Length", response.ContentLength.toString());
      }

      if (isDownload) {
        // Force download with filename
        headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName || "file")}"`);
        headers.set("Cache-Control", "no-cache");
      } else {
        // Set caching headers suitable for static assets
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }

      return new NextResponse(stream, { headers });

    } catch (error: unknown) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
