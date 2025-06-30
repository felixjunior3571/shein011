import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTANDO CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const clientId = process.env.SUPERPAYBR_TOKEN
    const clientSecret = process.env.SUPERPAYBR_SECRET_KEY

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            SUPERPAYBR_TOKEN: !clientId,
            SUPERPAYBR_SECRET_KEY: !clientSecret,
          },
        },
        { status: 500 },
      )
    }

    console.log("🔑 Testando autenticação...")

    // Testar autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authData = await authResponse.json()

    if (!authData.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: authData,
        },
        { status: 401 },
      )
    }

    console.log("✅ Autenticação bem-sucedida")

    // Testar endpoint de faturas
    const testResponse = await fetch("https://api.superpaybr.com/invoices?limit=1", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.data.access_token}`,
      },
    })

    if (testResponse.ok) {
      console.log("✅ Conexão com API SuperPayBR funcionando")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR funcionando perfeitamente",
        auth_token_expires_in: authData.data.expires_in,
        api_status: "operational",
        webhook_url: `${process.env.WEBHOOK_BASE_URL || request.nextUrl.origin}/api/superpaybr/webhook`,
      })
    } else {
      const errorText = await testResponse.text()
      console.log("❌ Erro na API SuperPayBR:", testResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro na API SuperPayBR: ${testResponse.status}`,
          details: errorText,
        },
        { status: testResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro no teste de conexão:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
