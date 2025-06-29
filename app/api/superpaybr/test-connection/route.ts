import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTANDO CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY
    const apiUrl = process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com"

    const envStatus = {
      SUPERPAYBR_TOKEN: !!token,
      SUPERPAYBR_SECRET_KEY: !!secretKey,
      SUPERPAYBR_API_URL: !!apiUrl,
    }

    console.log("🔍 Status das variáveis de ambiente:", envStatus)

    if (!token || !secretKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente SuperPayBR não configuradas",
        env_status: envStatus,
        missing_vars: Object.entries(envStatus)
          .filter(([key, value]) => !value)
          .map(([key]) => key),
      })
    }

    // Testar autenticação
    console.log("🔑 Testando autenticação SuperPayBR...")

    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authResult = await authResponse.json()

    if (authResult.success) {
      console.log("✅ Conexão SuperPayBR bem-sucedida!")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR estabelecida com sucesso",
        env_status: envStatus,
        auth_status: "success",
        api_url: apiUrl,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.log("❌ Falha na autenticação SuperPayBR:", authResult.error)

      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        env_status: envStatus,
        auth_status: "failed",
        auth_error: authResult.error,
        api_url: apiUrl,
      })
    }
  } catch (error) {
    console.log("❌ Erro no teste de conexão SuperPayBR:", error)

    return NextResponse.json({
      success: false,
      error: "Erro no teste de conexão SuperPayBR",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: NextRequest) {
  // Mesmo comportamento do GET
  return GET(request)
}
