import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    console.log("🔍 Verificando variáveis de ambiente:", {
      apiUrl: apiUrl ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
      token: token ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
      secretKey: secretKey ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
    })

    if (!apiUrl || !token || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Variáveis de ambiente SuperPayBR não configuradas",
          missing: {
            SUPERPAY_API_URL: !apiUrl,
            SUPERPAY_TOKEN: !token,
            SUPERPAY_SECRET_KEY: !secretKey,
          },
        },
        { status: 500 },
      )
    }

    // Testar autenticação
    console.log("🔐 Testando autenticação...")
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: authResult.error,
          step: "authentication",
        },
        { status: 500 },
      )
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida!")

    // Testar consulta de faturas (endpoint básico)
    console.log("📋 Testando consulta de faturas...")
    const accessToken = authResult.data.access_token

    const listResponse = await fetch(`${apiUrl}/v4/invoices?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("📥 Resposta da consulta:", {
      status: listResponse.status,
      statusText: listResponse.statusText,
      ok: listResponse.ok,
    })

    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      return NextResponse.json(
        {
          success: false,
          error: "Falha na consulta de faturas SuperPayBR",
          details: errorText,
          step: "invoice_list",
        },
        { status: 500 },
      )
    }

    const listData = await listResponse.json()
    console.log("✅ Consulta de faturas SuperPayBR bem-sucedida!")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR testada com sucesso!",
      tests: {
        environment_variables: "✅ PASS",
        authentication: "✅ PASS",
        api_access: "✅ PASS",
      },
      auth_data: {
        token_type: authResult.data.token_type,
        expires_in: authResult.data.expires_in,
      },
      api_response: {
        status: listResponse.status,
        has_data: !!listData.data,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        step: "general_error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Use GET para testar conexão",
    timestamp: new Date().toISOString(),
  })
}
