// Route API Auth - NE PAS utiliser Edge Runtime car Prisma n'est pas compatible (pour le dev local)
export const runtime = 'edge';

import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { seedAdminUser } from "@/lib/seed";

// Seed admin user on first API call
let seeded = false;
async function ensureAdminUser() {
  if (!seeded) {
    try {
      await seedAdminUser();
      seeded = true;
    } catch (error) {
      console.error("Failed to seed admin user:", error);
    }
  }
}

export async function GET(request: NextRequest) {
  await ensureAdminUser();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  await ensureAdminUser();
  return handlers.POST(request);
}
