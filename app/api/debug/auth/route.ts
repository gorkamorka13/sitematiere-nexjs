import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// export const runtime = 'edge'; // Commenté pour le dev local

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authenticated: !!session,
      session: session ? {
        user: {
          id: session.user?.id,
          username: session.user?.username,
          role: session.user?.role,
          name: session.user?.name,
        }
      } : null,
      cookies: {
        sessionToken: request.cookies.has('next-auth.session-token-v2'),
        csrfToken: request.cookies.has('next-auth.csrf-token-v2'),
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authenticated: false,
      error: {
        message: error.message,
        name: error.name,
      }
    }, { status: 500 });
  }
}
