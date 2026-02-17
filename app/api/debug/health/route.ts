import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Simple health check query
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      health: { success: true, message: "Connection OK" },
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_RUNTIME: process.env.NEXT_RUNTIME,
        CF_PAGES: process.env.CF_PAGES,
        HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
