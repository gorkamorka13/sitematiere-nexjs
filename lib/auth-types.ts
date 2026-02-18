import { userRoleEnum } from "@/lib/db/schema/enums";
import type { Session } from "next-auth";

export type UserRole = typeof userRoleEnum.enumValues[number];

export const UserRole = {
  ADMIN: "ADMIN" as const,
  USER: "USER" as const,
  VISITOR: "VISITOR" as const,
};

export function checkRole(session: Session | null, allowedRoles: UserRole[]): session is Session {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role as UserRole);
}

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