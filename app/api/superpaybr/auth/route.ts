import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== AUTENTICAÇÃO SUPERPAYBR ===")

    const clientId = process.env.SUPERPAYBR_TOKEN
    const clientSecret = process.env.SUPERPAYBR_SECRET_KEY

    if (!clientId || !clientSecret) {
      console.log("❌ Credenciais SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    console.log("🔑 Solicitando token de acesso...")

    const authResponse = await fetch("https://api.superpaybr.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Token obtido com sucesso")

      return NextResponse.json({
        success: true,
        data: authData,
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação SuperPayBR:", authResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro na autenticação: ${authResponse.status}`,
          details: errorText,
        },
        { status: authResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na autenticação",
      },
      { status: 500 },
    )
  }
}
