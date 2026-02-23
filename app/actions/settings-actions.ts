"use server";

import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth, checkRole } from "@/lib/auth";
import { UserRole } from "@/lib/auth-types";
import { revalidatePath } from "next/cache";

export async function getSystemSetting(key: string) {
  try {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    return setting?.value || null;
  } catch (error) {
    console.error(`Error fetching system setting ${key}:`, error);
    return null;
  }
}

export async function getAllSystemSettings() {
  try {
    const settings = await db.select().from(systemSettings);
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    console.error("Error fetching all system settings:", error);
    return {};
  }
}

export async function updateSystemSetting(key: string, value: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    throw new Error("Action non autorisée. Seuls les administrateurs peuvent modifier les paramètres système.");
  }

  try {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(`Error updating system setting ${key}:`, error);
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}
