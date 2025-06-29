import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Iniciando autenticação SuperPayBR...")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY
    const apiUrl = process.env.SUPERPAYBR_API_URL

    if (!token || !secretKey || !apiUrl) {
      console.error("❌ Credenciais SuperPayBR não encontradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    console.log("📋 Credenciais SuperPayBR encontradas:", {
      token: token.substring(0, 8) + "...",
      secretKey: secretKey.substring(0, 20) + "...",
      apiUrl,
    })

    // Autenticação Basic Auth conforme documentação SuperPayBR
    const credentials = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const authResponse = await fetch(`${apiUrl}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify({
        scope: "invoice.write customer.write webhook.write",
      }),
    })

    const authData = await authResponse.json()

    if (!authResponse.ok) {
      console.error("❌ Erro na autenticação SuperPayBR:", {
        status: authResponse.status,
        statusText: authResponse.statusText,
        data: authData,
      })
      return NextResponse.json(
        {
          success: false,
          error: `Erro de autenticação SuperPayBR: ${authResponse.status}`,
          details: authData,
        },
        { status: authResponse.status },
      )
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida!")

    return NextResponse.json({
      success: true,
      access_token: authData.access_token,
      token_type: authData.token_type,
      expires_in: authData.expires_in,
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na autenticação SuperPayBR",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Auth endpoint ativo",
    credentials: {
      token: process.env.SUPERPAYBR_TOKEN ? "✅ Configurado" : "❌ Não encontrado",
      secret: process.env.SUPERPAYBR_SECRET_KEY ? "✅ Configurado" : "❌ Não encontrado",
      api_url: process.env.SUPERPAYBR_API_URL || "❌ Não encontrado",
      webhook_url: process.env.SUPERPAYBR_WEBHOOK_URL || "❌ Não encontrado",
    },
  })
}
