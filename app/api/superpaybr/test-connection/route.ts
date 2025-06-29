import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    console.log("📋 Verificando configuração SuperPayBR:")
    console.log(`Token: ${token ? "✅ CONFIGURADO" : "❌ NÃO CONFIGURADO"}`)
    console.log(`Secret Key: ${secretKey ? "✅ CONFIGURADO" : "❌ NÃO CONFIGURADO"}`)
    console.log(`API URL: ${apiUrl ? "✅ CONFIGURADO" : "❌ NÃO CONFIGURADO"}`)

    if (!token || !secretKey || !apiUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Variáveis de ambiente SuperPayBR não configuradas",
          missing: {
            token: !token,
            secretKey: !secretKey,
            apiUrl: !apiUrl,
          },
        },
        { status: 500 },
      )
    }

    // Testar autenticação
    console.log("🔐 Testando autenticação SuperPayBR...")

    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authData = await authResponse.json()

    if (!authData.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: authData.error,
        },
        { status: 500 },
      )
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    // Testar endpoint da API
    console.log("🌐 Testando endpoint da API SuperPayBR...")

    const testResponse = await fetch(`${apiUrl}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
        Accept: "application/json",
      },
    })

    const apiStatus = testResponse.ok ? "✅ ONLINE" : "⚠️ OFFLINE"

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR testada com sucesso",
      config: {
        token: "✅ CONFIGURADO",
        secretKey: "✅ CONFIGURADO",
        apiUrl: "✅ CONFIGURADO",
      },
      auth: {
        status: "✅ SUCESSO",
        token_obtained: !!authData.access_token,
        method: authData.method || "standard",
      },
      api: {
        status: apiStatus,
        url: apiUrl,
        response_status: testResponse.status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao testar conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Test Connection endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
