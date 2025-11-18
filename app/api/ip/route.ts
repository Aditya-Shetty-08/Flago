import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ip - Get client IP address
 * Used for anonymous user identification
 */
export async function GET(request: NextRequest) {
  // Try to get IP from various headers (for different hosting providers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  let ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';

  // Remove port if present
  ip = ip.split(':')[0];

  return NextResponse.json({ ip }, { status: 200 });
}

