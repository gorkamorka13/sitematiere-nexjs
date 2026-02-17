import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compareSync } from "bcrypt-ts";
import { z } from "zod";
import { User } from "@prisma/client";
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
                logger.debug("[Auth_Authorize] Attempting login for user/email:", credentials?.username);
                try {
                    const parsedCredentials = z
                        .object({ username: z.string(), password: z.string().min(6) })
                        .safeParse(credentials);

                    if (!parsedCredentials.success) {
                        logger.warn("[Auth_Authorize] Invalid credentials format provided");
                        return null;
                    }

                    const { username, password } = parsedCredentials.data;

                    logger.debug("[Auth_Authorize] Querying database for user:", username);
                    const user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { username: username },
                                { email: username }
                            ]
                        }
                    });

                    if (!user) {
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
                        logger.info("[Auth_Authorize] SUCCESS: Password match successful for:", username);
                        return user;
                    } else {
                        logger.warn("[Auth_Authorize] FAILURE: Password mismatch for user:", username);
                    }
                } catch (error) {
                    logger.error("[Auth_Authorize] CRITICAL ERROR during authorization process:", error);
                    const err = error as { name?: string; message?: string; code?: string; meta?: unknown };
                    logger.error("[Auth_Authorize] Stack/Details:", {
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
        async jwt({ token, user }) {
            if (user) {
                const u = user as User;
                token.id = u.id;
                token.role = u.role;
                token.username = u.username;
                token.name = u.name;
                token.color = u.color;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.username = token.username as string;
                session.user.name = token.name as string;
                session.user.color = token.color as string | null;
            }
            return session;
        },
    },
});
