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

console.error("[AUTH_INIT] NextAuth config - AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
console.error("[AUTH_INIT] NextAuth config - NODE_ENV:", process.env.NODE_ENV);

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
                console.error("[AUTH_FLOW] Authorize callback started");
                console.error("[AUTH_FLOW] Credentials type:", typeof credentials);
                console.error("[AUTH_FLOW] Credentials keys:", credentials ? Object.keys(credentials) : 'null');
                console.error("[AUTH_FLOW] Raw credentials:", JSON.stringify(credentials, null, 2));
                
                // Handle edge case where credentials might be nested
                let creds = credentials as { username?: string; password?: string } | undefined;
                
                // If credentials is undefined or null, try to extract from nested structure
                if (!creds || (!creds.username && !creds.password)) {
                    const nestedCreds = credentials as Record<string, unknown> | undefined;
                    if (nestedCreds?.json) {
                        try {
                            creds = JSON.parse(String(nestedCreds.json));
                            console.error("[AUTH_FLOW] Parsed nested JSON credentials");
                        } catch (e) {
                            console.error("[AUTH_FLOW] Failed to parse nested JSON:", e);
                        }
                    }
                }
                
                console.error("[AUTH_FLOW] Processed credentials - username:", creds?.username);
                logger.debug("[Auth_Authorize] Attempting login for user/email:", creds?.username);
                logger.debug("[Auth_Authorize] Raw credentials received:", { 
                    hasUsername: !!creds?.username, 
                    hasPassword: !!creds?.password,
                    usernameType: typeof creds?.username,
                    passwordLength: creds?.password?.length || 0
                });
                
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

                    logger.debug("[Auth_Authorize] Querying database for user:", username);
                    const [user] = await db
                        .select()
                        .from(users)
                        .where(or(eq(users.username, username), eq(users.email, username)))
                        .limit(1);

                    if (!user) {
                        console.error("[AUTH_FLOW] USER NOT FOUND in database:", username);
                        logger.warn("[Auth_Authorize] USER NOT FOUND in database:", username);
                        return null;
                    }

                    if (!user.passwordHash) {
                        logger.error("[Auth_Authorize] CRITICAL: User has NO password hash set:", username);
                        return null;
                    }

                    logger.debug("[Auth_Authorize] User found, verifying password hash...");
                    const passwordsMatch = compareSync(password, user.passwordHash);

                    if (passwordsMatch) {
                        console.error("[AUTH_FLOW] SUCCESS: Password match successful for:", username);
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
                        console.error("[AUTH_FLOW] FAILURE: Password mismatch for user:", username);
                        logger.warn("[Auth_Authorize] FAILURE: Password mismatch for user:", username);
                    }
                } catch (error) {
                    logger.error("[Auth_Authorize] CRITICAL ERROR during authorization process:", error);
                    console.error("[AUTH_ERROR] Authorize callback error:", error);
                    const err = error as { name?: string; message?: string; code?: string; meta?: unknown };
                    console.error("[AUTH_ERROR] Error details:", {
                        name: err.name,
                        message: err.message,
                        code: err.code,
                        meta: err.meta
                    });
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, account }) {
            try {
                console.error("[AUTH_FLOW] JWT callback triggered", { trigger, hasUser: !!user, account: account?.provider });
                logger.debug("[Auth_JWT] JWT callback triggered", { trigger, hasUser: !!user, account: account?.provider });
                if (user) {
                    const u = user as User;
                    console.error("[AUTH_FLOW] JWT callback adding user to token", { userId: u.id, username: u.username });
                    logger.debug("[Auth_JWT] Adding user data to token", { 
                        userId: u.id, 
                        username: u.username,
                        role: u.role 
                    });
                    token.id = u.id;
                    token.role = u.role;
                    token.username = u.username;
                    token.name = u.name;
                    token.color = u.color;
                }
                logger.debug("[Auth_JWT] Returning token", { tokenId: token.id });
                return token;
            } catch (error) {
                console.error("[AUTH_ERROR] JWT callback error:", error);
                throw error;
            }
        },
        async session({ session, token, trigger }) {
            try {
                logger.debug("[Auth_Session] Session callback triggered", { trigger });
                if (session.user) {
                    session.user.id = token.id as string;
                    session.user.role = token.role as UserRole;
                    session.user.username = token.username as string;
                    session.user.name = token.name as string;
                    session.user.color = token.color as string | null;
                    logger.debug("[Auth_Session] Session populated with user data", { 
                        userId: session.user.id,
                        username: session.user.username 
                    });
                }
                return session;
            } catch (error) {
                console.error("[AUTH_ERROR] Session callback error:", error);
                throw error;
            }
        },
    },
});