import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders, standardRateLimit } from '@/lib/ratelimit';

// Helper to extract client IP for rate limiting
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'anonymous';
}

// Test route to check if routing in this segment works
export async function GET(request: Request) {
  console.log("--- Test Route /api/tacticus/guildRaid/test HIT ---");

  // Check rate limit (IP-based)
  const clientIp = getClientIp(request);
  const rateLimitResult = await checkRateLimit(`test:${clientIp}`, standardRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  return NextResponse.json({ message: 'Test route OK' });
} 