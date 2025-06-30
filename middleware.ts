import { NextResponse, type NextRequest } from "next/server"

// Rate limiting storage (em produção, usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Configuração de rate limiting otimizada para múltiplos usuários
const RATE_LIMITS = {
  // Webhook - SEM LIMITE (crítico!)
  webhook: { windowMs: 0, maxRequests: Number.POSITIVE_INFINITY },

  // SSE Stream - limite alto para suportar múltiplos usuários
  sse: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 conexões por minuto

  // Check status - limite médio (cache reduz necessidade)
  status: { windowMs: 60 * 1000, maxRequests: 200 }, // 200 verificações por minuto

  // Create invoice - limite baixo (operação custosa)
  create: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 criações por minuto

  // APIs gerais - limite padrão
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests por minuto

  // Checkout pages - limite alto
  checkout: { windowMs: 60 * 1000, maxRequests: 300 }, // 300 acessos por minuto
}

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIp || "unknown"
}

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  if (limit === Number.POSITIVE_INFINITY) return false // Sem limite

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

function getRateLimitConfig(pathname: string) {
  // Webhook - NUNCA limitar!
  if (pathname.includes("/webhook")) {
    return RATE_LIMITS.webhook
  }

  // SSE Stream - limite alto
  if (pathname.includes("/payment-stream")) {
    return RATE_LIMITS.sse
  }

  // Status check - limite médio
  if (pathname.includes("/check-webhook-status") || pathname.includes("/payment-status")) {
    return RATE_LIMITS.status
  }

  // Create invoice - limite baixo
  if (pathname.includes("/create-invoice") || pathname.includes("/create-activation-invoice")) {
    return RATE_LIMITS.create
  }

  // Checkout pages - limite alto
  if (pathname.startsWith("/checkout") || pathname.startsWith("/upp")) {
    return RATE_LIMITS.checkout
  }

  // APIs gerais - limite padrão
  if (pathname.startsWith("/api")) {
    return RATE_LIMITS.api
  }

  // Sem limite para outras rotas
  return { windowMs: 0, maxRequests: Number.POSITIVE_INFINITY }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getRateLimitKey(request)

  // Obter configuração de rate limit
  const config = getRateLimitConfig(pathname)

  // Log para debugging
  if (pathname.includes("/api/superpaybr")) {
    console.log(`🔒 Rate limit check: ${pathname} | IP: ${ip} | Limit: ${config.maxRequests}/${config.windowMs}ms`)
  }

  // Aplicar rate limiting
  if (isRateLimited(ip, config.maxRequests, config.windowMs)) {
    console.log(`🚫 Rate limit exceeded: ${pathname} | IP: ${ip}`)

    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Muitas requisições. Tente novamente em alguns segundos.",
        retryAfter: Math.ceil(config.windowMs / 1000),
        endpoint: pathname,
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(config.windowMs / 1000).toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(Date.now() + config.windowMs).toISOString(),
        },
      },
    )
  }

  // Adicionar headers de rate limit para respostas bem-sucedidas
  const current = rateLimitMap.get(ip)
  const response = NextResponse.next()

  if (current && config.maxRequests !== Number.POSITIVE_INFINITY) {
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
    response.headers.set("X-RateLimit-Remaining", Math.max(0, config.maxRequests - current.count).toString())
    response.headers.set("X-RateLimit-Reset", new Date(current.resetTime).toISOString())
  }

  return response
}

export const config = {
  matcher: ["/api/:path*", "/checkout/:path*", "/upp/:path*"],
}
