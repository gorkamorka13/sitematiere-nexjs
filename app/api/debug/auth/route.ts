import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { compareSync } from 'bcrypt-ts';


export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    logs.push(`[DEBUG] Starting auth check at ${new Date().toISOString()}`);
    logs.push(`[DEBUG] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
    logs.push(`[DEBUG] AUTH_SECRET exists: ${!!process.env.AUTH_SECRET}`);
    logs.push(`[DEBUG] NEXT_RUNTIME: ${process.env.NEXT_RUNTIME || 'undefined'}`);

    const session = await auth();
    logs.push(`[DEBUG] Session retrieved: ${!!session}`);

    const allCookies = request.cookies.getAll();
    logs.push(`[DEBUG] Cookies count: ${allCookies.length}`);
    logs.push(`[DEBUG] Cookie names: ${allCookies.map(c => c.name).join(', ')}`);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      logs,
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
        all: allCookies.map(c => ({ name: c.name, valueLength: c.value?.length || 0 })),
        sessionToken: request.cookies.has('authjs.session-token'),
        sessionTokenV2: request.cookies.has('next-auth.session-token-v2'),
        csrfToken: request.cookies.has('next-auth.csrf-token-v2'),
      },
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        nodeEnv: process.env.NODE_ENV,
        nextRuntime: process.env.NEXT_RUNTIME,
      }
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logs.push(`[ERROR] ${err.message}`);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      logs,
      authenticated: false,
      error: {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 5),
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    const body = await request.json();
    const { username, password } = body;

    logs.push(`[DEBUG] Testing login for: ${username}`);
    logs.push(`[DEBUG] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      logs.push(`[DEBUG] User not found`);
      return NextResponse.json({ success: false, logs, error: 'User not found' });
    }

    logs.push(`[DEBUG] User found: ${user.username}, role: ${user.role}`);
    logs.push(`[DEBUG] Has passwordHash: ${!!user.passwordHash}`);

    if (user.passwordHash) {
      const match = compareSync(password, user.passwordHash);
      logs.push(`[DEBUG] Password match: ${match}`);

      return NextResponse.json({
        success: match,
        logs,
        durationMs: Date.now() - startTime,
        user: match ? {
          id: user.id,
          username: user.username,
          role: user.role,
        } : null
      });
    }

    return NextResponse.json({ success: false, logs, error: 'No password hash' });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logs.push(`[ERROR] ${err.message}`);
    return NextResponse.json({
      success: false,
      logs,
      error: { message: err.message, name: err.name }
    }, { status: 500 });
  }
}
