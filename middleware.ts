import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    // Read the session token from cookies
    const sessionToken = request.cookies.get("next-auth.session-token-v2")?.value;
    const isLoginPage = request.nextUrl.pathname === "/login";

    // Simple check: if no token and not on login page, redirect to login
    if (!sessionToken && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If has token and on login page, redirect to home
    if (sessionToken && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|markers|images|public|export-db|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)",
    ],
};
