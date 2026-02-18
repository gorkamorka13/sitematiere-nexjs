import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

interface DebugInfo {
  timestamp: string;
  environment: {
    nodeEnv: string | undefined;
    runtime: string;
    cfPages: string | undefined;
  };
  envVarsPresent: Record<string, boolean>;
  envVarsPartialValues: Record<string, string>;
  databaseConnection: {
    status: string;
    error: null | Record<string, string>;
    userCount: number;
    firstUser?: unknown;
  };
}


export async function GET() {
  const debugInfo: DebugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      runtime: process.env.NEXT_RUNTIME || 'unknown',
      cfPages: process.env.CF_PAGES,
    },
    envVarsPresent: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      R2_ENDPOINT: !!process.env.R2_ENDPOINT,
      R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
      R2_PUBLIC_URL: !!process.env.R2_PUBLIC_URL,
    },
    envVarsPartialValues: {
      DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? `${process.env.NEXTAUTH_SECRET.substring(0, 10)}...` : 'NOT SET',
    },
    databaseConnection: {
      status: 'unknown',
      error: null,
      userCount: 0,
    },
  };

  try {
    const userCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(users);
    const userCount = Number(userCountResult[0]?.count ?? 0);
    
    debugInfo.databaseConnection.status = 'connected';
    debugInfo.databaseConnection.userCount = userCount;

    const firstUser = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
      .from(users)
      .orderBy(asc(users.createdAt))
      .limit(1);

    debugInfo.databaseConnection.firstUser = firstUser[0];
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    debugInfo.databaseConnection.status = 'error';
    debugInfo.databaseConnection.error = {
      message: err.message,
      name: err.name,
    };
  }

  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}