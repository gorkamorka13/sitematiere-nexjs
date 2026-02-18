import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get("authjs.session-token")?.value;
    const isLoginPage = request.nextUrl.pathname === "/login";

    if (!sessionToken && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

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
