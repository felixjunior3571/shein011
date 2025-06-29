import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function GET(request: NextRequest) {
  try {
    console.log("🔗 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const webhookUrl = process.env.SUPERPAY_WEBHOOK_URL

    if (!token || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            SUPERPAY_TOKEN: !token,
            SUPERPAY_SECRET_KEY: !secretKey,
            SUPERPAY_WEBHOOK_URL: !webhookUrl,
          },
        },
        { status: 500 },
      )
    }

    // Testar autenticação
    const accessToken = await getSuperPayAccessToken()

    // Testar endpoint de invoices
    const testResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log("📥 Resposta do teste:", {
      status: testResponse.status,
      statusText: testResponse.statusText,
      ok: testResponse.ok,
    })

    return NextResponse.json({
      success: true,
      message: "✅ Conexão SuperPayBR testada com sucesso!",
      data: {
        api_url: "https://api.superpaybr.com",
        invoices_endpoint: "https://api.superpaybr.com/v4/invoices",
        authenticated: true,
        token_preview: accessToken.slice(0, 8) + "••••••••",
        test_status: testResponse.status,
        test_ok: testResponse.ok,
        webhook_configured: !!webhookUrl,
        tested_at: new Date().toISOString(),
      },
      environment: {
        token_configured: !!token,
        secret_configured: !!secretKey,
        webhook_configured: !!webhookUrl,
      },
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Falha no teste de conexão SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
