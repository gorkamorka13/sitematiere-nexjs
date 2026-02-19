// Route API Auth - NE PAS utiliser Edge Runtime car Prisma n'est pas compatible (pour le dev local)

import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const response = await handlers.GET(request);
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
  } catch (e) {
    // Silently continue
  }

  try {
    const response = await handlers.POST(request);
    return response;
  } catch (error) {
    logger.error("[Auth_Route] POST error", error);
    throw error;
  }
}
