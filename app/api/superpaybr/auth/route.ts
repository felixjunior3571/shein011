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
        },
        { status: 500 },
      )
    }

    console.log("🔑 Fazendo autenticação SuperPayBR...")
    console.log("Token:", token.substring(0, 10) + "...")
    console.log("Secret:", secretKey.substring(0, 20) + "...")

    // Fazer autenticação na SuperPayBR
    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    console.log("📥 Resposta auth SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")
      console.log("Account:", authData.account)
      console.log("Working:", authData.working)
      console.log("Expires:", new Date(authData.expires_in * 1000).toISOString())

      return NextResponse.json({
        success: true,
        data: {
          access_token: authData.access_token,
          token_type: authData.token_type,
          expires_in: authData.expires_in,
          account: authData.account,
          working: authData.working,
          scope: authData.scope,
        },
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação SuperPayBR:", authResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro na autenticação SuperPayBR: ${authResponse.status} - ${errorText}`,
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
      },
      { status: 500 },
    )
  }
}
