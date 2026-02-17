import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compareSync } from "bcrypt-ts";
import { z } from "zod";
import { User, UserRole } from "@prisma/client";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    trustHost: true,
    cookies: {
        sessionToken: {
            name: `next-auth.session-token-v2`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        csrfToken: {
            name: `next-auth.csrf-token-v2`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        callbackUrl: {
            name: `next-auth.callback-url-v2`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
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
                console.log("[Auth_Authorize] Attempting login for user/email:", credentials?.username);
                try {
                    const parsedCredentials = z
                        .object({ username: z.string(), password: z.string().min(6) })
                        .safeParse(credentials);

                    if (parsedCredentials.success) {
                        const { username, password } = parsedCredentials.data;

                        // Allow login with either username OR email
                        console.log("[Auth_Authorize] Querying database for user...");
                        const user = await prisma.user.findFirst({
                            where: {
                                OR: [
                                    { username: username },
                                    { email: username }
                                ]
                            }
                        });

                        if (!user) {
                            console.warn("[Auth_Authorize] User not found in database:", username);
                            return null;
                        }

                        if (!user.passwordHash) {
                            console.warn("[Auth_Authorize] User has no password hash set:", username);
                            return null;
                        }

                        console.log("[Auth_Authorize] User found, verifying password hash...");
                        const passwordsMatch = compareSync(password, user.passwordHash);

                        if (passwordsMatch) {
                            console.log("[Auth_Authorize] Password match successful for:", username);
                            return user;
                        } else {
                            console.warn("[Auth_Authorize] Password mismatch for:", username);
                        }
                    } else {
                        console.warn("[Auth_Authorize] Invalid credentials format provided");
                    }
                } catch (error) {
                    console.error("[Auth_Authorize] UNEXPECTED ERROR during authorization:", error);
                    // Log more details if it's a Prisma error
                    const err = error as { name?: string; message?: string; code?: string; meta?: unknown };
                    console.error("[Auth_Authorize] Error Details:", JSON.stringify({
                        name: err.name,
                        message: err.message,
                        code: err.code,
                        meta: err.meta
                    }));
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
