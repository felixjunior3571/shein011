import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔐 Iniciando autenticação SuperPayBR...")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY
    const apiUrl = process.env.SUPERPAYBR_API_URL

    if (!token || !secretKey || !apiUrl) {
      console.error("❌ Variáveis de ambiente SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Configuração SuperPayBR incompleta",
          missing: {
            token: !token,
            secretKey: !secretKey,
            apiUrl: !apiUrl,
          },
        },
        { status: 500 },
      )
    }

    console.log("🔑 Fazendo autenticação com SuperPayBR...")

    const authResponse = await fetch(`${apiUrl}/v4/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${secretKey}`,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
      }),
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error("❌ Erro na autenticação SuperPayBR:", {
        status: authResponse.status,
        statusText: authResponse.statusText,
        error: errorText,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Falha na autenticação SuperPayBR: ${authResponse.status} - ${authResponse.statusText}`,
          details: errorText,
        },
        { status: authResponse.status },
      )
    }

    const authData = await authResponse.json()
    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      message: "Autenticação SuperPayBR realizada com sucesso",
      data: {
        access_token: authData.access_token,
        token_type: authData.token_type,
        expires_in: authData.expires_in,
      },
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na autenticação SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return GET()
}
