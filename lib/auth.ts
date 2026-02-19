import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { compareSync } from "bcrypt-ts";
import { z } from "zod";
import { type User } from "@/lib/db/schema";
import { UserRole, checkRole } from "./auth-types";
import { logger } from "@/lib/logger";

export { UserRole, checkRole };

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                username: { label: "Nom d'utilisateur", type: "text" },
                password: { label: "Mot de passe", type: "password" },
            },
            async authorize(credentials) {
                // Handle edge case where credentials might be nested
                let creds = credentials as { username?: string; password?: string } | undefined;

                // If credentials is undefined or null, try to extract from nested structure
                if (!creds || (!creds.username && !creds.password)) {
                    const nestedCreds = credentials as Record<string, unknown> | undefined;
                    if (nestedCreds?.json) {
                        try {
                            creds = JSON.parse(String(nestedCreds.json));
                        } catch (e) {
                            logger.error("[Auth_Authorize] Failed to parse nested JSON:", e);
                        }
                    }
                }


                try {
                    const parsedCredentials = z
                        .object({ username: z.string().min(1), password: z.string().min(1) })
                        .safeParse(creds);

                    if (!parsedCredentials.success) {
                        logger.warn("[Auth_Authorize] Invalid credentials format provided", {
                            error: parsedCredentials.error?.issues,
                            username: creds?.username,
                            passwordLength: creds?.password?.length || 0
                        });
                        return null;
                    }

                    const { username, password } = parsedCredentials.data;

                    const [user] = await db
                        .select()
                        .from(users)
                        .where(or(eq(users.username, username), eq(users.email, username)))
                        .limit(1);

                    if (!user) {
                        logger.warn("[Auth_Authorize] USER NOT FOUND in database:", username);
                        return null;
                    }

                    if (!user.passwordHash) {
                        logger.error("[Auth_Authorize] CRITICAL: User has NO password hash set:", username);
                        return null;
                    }

                    const passwordsMatch = compareSync(password, user.passwordHash);

                    if (passwordsMatch) {
                        logger.info("[Auth_Authorize] SUCCESS: Password match successful for:", username);
                        return {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            color: user.color,
                            passwordHash: user.passwordHash,
                            createdAt: user.createdAt?.toISOString() ?? null,
                            updatedAt: user.updatedAt?.toISOString() ?? null,
                        };
                    } else {
                        logger.warn("[Auth_Authorize] FAILURE: Password mismatch for user:", username);
                    }
                } catch (error) {
                    logger.error("[Auth_Authorize] CRITICAL ERROR during authorization process:", error);
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, account }) {
            try {
                if (user) {
                    const u = user as User;
                    token.id = u.id;
                    token.role = u.role;
                    token.username = u.username;
                    token.name = u.name;
                    token.color = u.color;
                }
                return token;
            } catch (error) {
                throw error;
            }
        },
        async session({ session, token }) {
            try {
                if (session.user) {
                    session.user.id = token.id as string;
                    session.user.role = token.role as UserRole;
                    session.user.username = token.username as string;
                    session.user.name = token.name as string;
                    session.user.color = token.color as string | null;
                }
                return session;
            } catch (error) {
                throw error;
            }
        },
    },
});
