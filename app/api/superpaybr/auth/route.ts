import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== AUTENTICAÇÃO SUPERPAYBR ===")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      console.log("❌ Credenciais SuperPayBR não encontradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          details: "SUPERPAYBR_TOKEN e SUPERPAYBR_SECRET_KEY devem estar configurados",
        },
        { status: 500 },
      )
    }

    console.log("🔑 Fazendo autenticação SuperPayBR...")
    console.log("Token:", token.substring(0, 10) + "...")
    console.log("Secret:", secretKey.substring(0, 20) + "...")

    // Fazer autenticação na SuperPayBR usando Basic Auth
    const authResponse = await fetch("https://api.superpaybr.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
      }),
    })

    console.log("📥 Resposta auth SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")
      console.log("Token Type:", authData.token_type)
      console.log("Expires In:", authData.expires_in)

      return NextResponse.json({
        success: true,
        data: {
          access_token: authData.access_token,
          token_type: authData.token_type,
          expires_in: authData.expires_in,
          scope: authData.scope,
        },
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação SuperPayBR:", authResponse.status, errorText)

      // Retornar erro específico para debugging
      return NextResponse.json(
        {
          success: false,
          error: `Erro na autenticação SuperPayBR: ${authResponse.status}`,
          details: errorText,
          status_code: authResponse.status,
        },
        { status: authResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro na autenticação SuperPayBR:", error)
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
