import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Verificar se a rota é protegida
  if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
    // Obter o token do cookie
    const token = request.cookies.get("admin_auth")?.value

    // Se não houver token, redirecionar para login
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    try {
      // Verificar se o token é válido (decodificar base64)
      const decoded = Buffer.from(token, "base64").toString("utf-8")
      const [username, timestamp] = decoded.split(":")

      // Verificar se o token não expirou (24 horas)
      const tokenTime = Number.parseInt(timestamp)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000

      if (username === "admin" && now - tokenTime < twentyFourHours) {
        // Token válido, permitir acesso
        return NextResponse.next()
      } else {
        // Token expirado, redirecionar para login
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    } catch (error) {
      // Token inválido, redirecionar para login
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }

  // Não é uma rota protegida, continuar normalmente
  return NextResponse.next()
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: ["/admin/:path*"],
}
