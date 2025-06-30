import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number; blockUntil?: number }>()

// Rate limiting configuration
const RATE_LIMITS = {
  "/api/superpaybr/auth": { requests: 3, windowMs: 60000 }, // 3 req/min
  "/api/superpaybr/create-invoice": { requests: 3, windowMs: 60000 }, // 3 req/min
  "/api/superpaybr/payment-status": { requests: 3, windowMs: 60000 }, // 3 req/min
  "/api/superpaybr/test-connection": { requests: 2, windowMs: 60000 }, // 2 req/min
  "/api/superpaybr/simulate-payment": { requests: 5, windowMs: 60000 }, // 5 req/min
}

// Block durations (progressive)
const BLOCK_DURATIONS = [
  5 * 60 * 1000, // 5 minutes
  30 * 60 * 1000, // 30 minutes
  60 * 60 * 1000, // 1 hour
  12 * 60 * 60 * 1000, // 12 hours
  24 * 60 * 60 * 1000, // 24 hours
  48 * 60 * 60 * 1000, // 48 hours
  100 * 60 * 60 * 1000, // 100 hours
]

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return "unknown"
}

function getRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`
}

function isRateLimited(key: string, limit: { requests: number; windowMs: number }): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record) {
    rateLimitMap.set(key, { count: 1, resetTime: now + limit.windowMs })
    return false
  }

  // Check if user is currently blocked
  if (record.blockUntil && now < record.blockUntil) {
    console.log(`🚫 IP ${key} está bloqueado até ${new Date(record.blockUntil).toISOString()}`)
    return true
  }

  // Reset window if expired
  if (now > record.resetTime) {
    record.count = 1
    record.resetTime = now + limit.windowMs
    record.blockUntil = undefined
    return false
  }

  // Increment counter
  record.count++

  // Check if limit exceeded
  if (record.count > limit.requests) {
    // Calculate block duration (progressive)
    const violations = Math.min(record.count - limit.requests, BLOCK_DURATIONS.length)
    const blockDuration = BLOCK_DURATIONS[violations - 1] || BLOCK_DURATIONS[BLOCK_DURATIONS.length - 1]

    record.blockUntil = now + blockDuration

    console.log(`⚠️ Rate limit exceeded for ${key}. Blocked for ${blockDuration / 1000 / 60} minutes`)

    return true
  }

  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip rate limiting for webhook endpoints (critical for payment processing)
  if (pathname.includes("/webhook")) {
    return NextResponse.next()
  }

  // Check if path needs rate limiting
  const rateLimitConfig = Object.entries(RATE_LIMITS).find(([path]) => pathname.startsWith(path))

  if (rateLimitConfig) {
    const [path, limit] = rateLimitConfig
    const clientIP = getClientIP(request)
    const rateLimitKey = getRateLimitKey(clientIP, path)

    if (isRateLimited(rateLimitKey, limit)) {
      console.log(`🚫 Rate limit blocked: ${clientIP} -> ${path}`)

      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: "Please wait before making another request",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": limit.requests.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      )
    }

    console.log(`✅ Rate limit OK: ${clientIP} -> ${path}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/superpaybr/:path*", "/api/tryplopay/:path*", "/api/superpay/:path*"],
}
