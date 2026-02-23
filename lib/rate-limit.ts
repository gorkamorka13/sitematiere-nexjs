/**
 * Simple in-memory rate limiter for Server Actions.
 * Note: In serverless environments (like Cloudflare), this is per-isolate.
 * For production, use a persistent store like Upstash/Redis.
 */

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // 10 requests per minute

export async function rateLimit(identifier: string): Promise<boolean> {
  const now = Date.now();
  const userData = rateLimitMap.get(identifier) || { count: 0, lastReset: now };

  if (now - userData.lastReset > WINDOW_MS) {
    userData.count = 0;
    userData.lastReset = now;
  }

  userData.count++;
  rateLimitMap.set(identifier, userData);

  return userData.count <= MAX_REQUESTS;
}
