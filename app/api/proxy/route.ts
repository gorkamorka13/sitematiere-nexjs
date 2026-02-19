import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";


export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Ensure absolute URL
  let targetUrl = imageUrl;
  if (!targetUrl.startsWith('http')) {
    const baseUrl = request.nextUrl.origin;
    targetUrl = new URL(targetUrl, baseUrl).toString();
  }

  try {
    logger.info(`[Proxy] Fetching: ${targetUrl}`);

    // Some environments (like Cloudflare) have their own timeouts.
    // Removing the manual AbortController as it might be too aggressive or conflicting.
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      logger.error(`[Proxy] Fetch failed for ${targetUrl}: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        error: `Failed to fetch image: ${response.status} ${response.statusText}`,
        url: targetUrl
      }, { status: response.status });
    }

    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=3600");

    // Stream the body instead of loading into a blob to save memory and avoid timeouts
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    logger.error(`[Proxy] Critical error fetching ${targetUrl}:`, error);
    return NextResponse.json({
      error: "Failed to proxy image",
      details: error instanceof Error ? error.message : String(error),
      url: targetUrl
    }, { status: 500 });
  }
}
