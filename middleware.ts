import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    // Check for all possible session cookie names
    const cookies = request.cookies;
    const sessionToken = cookies.get("authjs.session-token")?.value ||
                        cookies.get("__Secure-authjs.session-token")?.value ||
                        cookies.get("__Host-authjs.session-token")?.value ||
                        cookies.get("next-auth.session-token")?.value ||
                        cookies.get("__Secure-next-auth.session-token")?.value;
    
    const isLoginPage = request.nextUrl.pathname === "/login";
    
    // Debug logging - remove after fixing
    console.log("[Middleware] Path:", request.nextUrl.pathname);
    console.log("[Middleware] All cookies:", Array.from(cookies.getAll()).map(c => c.name));
    console.log("[Middleware] Session found:", !!sessionToken);

    if (!sessionToken && !isLoginPage) {
        console.log("[Middleware] Redirecting to login - no session");
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (sessionToken && isLoginPage) {
        console.log("[Middleware] Redirecting to home - has session");
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|markers|images|public|export-db|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)",
    ],
};
