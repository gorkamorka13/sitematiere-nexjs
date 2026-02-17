import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

export { UserRole };

/**
 * Centralized helper to check if a user has the required roles.
 * @param session - The current user session
 * @param allowedRoles - Array of roles that are permitted
 * @returns session is Session - Type guard ensuring session and role are present
 */
export function checkRole(session: Session | null, allowedRoles: UserRole[]): session is Session {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role as UserRole);
}

// Étendre les types NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      username: string;
      name: string | null;
      color: string | null;
    };
  }
}
