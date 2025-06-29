import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔧 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    const envCheck = {
      token: !!token,
      secretKey: !!secretKey,
      apiUrl: !!apiUrl,
    }

    console.log("📋 Verificação de ambiente:", envCheck)

    if (!token || !secretKey || !apiUrl) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente SuperPayBR não configuradas",
        env_check: envCheck,
      })
    }

    // Testar autenticação
    console.log("🔐 Testando autenticação...")
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        auth_error: authResult.error,
        env_check: envCheck,
      })
    }

    console.log("✅ Conexão SuperPayBR testada com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR funcionando",
      auth_success: true,
      token_cached: authResult.cached,
      env_check: envCheck,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString(),
    })
  }
}
