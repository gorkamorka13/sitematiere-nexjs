// Route API Auth - NE PAS utiliser Edge Runtime car Prisma n'est pas compatible (pour le dev local)

import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  logger.debug("[Auth_Route] GET request received", { 
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });
  try {
    const response = await handlers.GET(request);
    logger.debug("[Auth_Route] GET response", { 
      status: response.status,
      ok: response.ok 
    });
    return response;
  } catch (error) {
    logger.error("[Auth_Route] GET error", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  // Clone the request to read the body
  const clonedRequest = request.clone();
  let bodyText = "";
  try {
    bodyText = await clonedRequest.text();
    logger.debug("[Auth_Route] POST request received", { 
      url: request.url,
      contentType: request.headers.get("content-type"),
      bodyPreview: bodyText.substring(0, 500) // Log first 500 chars
    });
  } catch (e) {
    logger.debug("[Auth_Route] Could not read body", { error: String(e) });
  }
  
  try {
    const response = await handlers.POST(request);
    logger.debug("[Auth_Route] POST response", { 
      status: response.status,
      ok: response.ok 
    });
    return response;
  } catch (error) {
    logger.error("[Auth_Route] POST error", error);
    throw error;
  }
}
