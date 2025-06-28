import { NextResponse, type NextRequest } from "next/server"

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes block
}

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIp || "unknown"
}

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const key = ip

  const current = rateLimitMap.get(key)

  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  if (current.count >= limit) {
    return true
  }

  current.count++
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // NEVER rate limit webhook endpoints - CRITICAL!
  if (pathname === "/api/tryplopay/webhook" || pathname === "/api/superpaybr/webhook") {
    console.log(`🔔 Webhook endpoint - NO rate limiting applied: ${pathname}`)
    return NextResponse.next()
  }

  // Apply rate limiting only to API routes and checkout
  if (pathname.startsWith("/api") || pathname.startsWith("/checkout")) {
    const ip = getRateLimitKey(request)

    // Different limits for different endpoints
    let limit = 30 // requests per minute
    let windowMs = 60 * 1000 // 1 minute

    // VERY strict limits for payment APIs (except webhooks)
    if ((pathname.includes("/tryplopay/") || pathname.includes("/superpaybr/")) && !pathname.includes("/webhook")) {
      limit = 5 // Only 5 requests per minute for payment APIs
      windowMs = 60 * 1000
      console.log(`🔒 Applying STRICT rate limit (${limit}/min) to payment API: ${pathname}`)
    }

    if (isRateLimited(ip, limit, windowMs)) {
      console.log(`🚫 Rate limit exceeded for IP: ${ip} on ${pathname}`)

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(windowMs / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(windowMs / 1000).toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString(),
          },
        },
      )
    }

    // Add rate limit headers to successful responses
    const current = rateLimitMap.get(ip)
    const response = NextResponse.next()

    if (current) {
      response.headers.set("X-RateLimit-Limit", limit.toString())
      response.headers.set("X-RateLimit-Remaining", Math.max(0, limit - current.count).toString())
      response.headers.set("X-RateLimit-Reset", new Date(current.resetTime).toISOString())
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*", "/checkout/:path*", "/upp/checkout/:path*"],
}
