// Route API Auth - NE PAS utiliser Edge Runtime car Prisma n'est pas compatible (pour le dev local)
export const runtime = 'edge';

import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  return handlers.POST(request);
}
