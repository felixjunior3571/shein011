import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
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

    // Criar Basic Auth header
    const credentials = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    console.log("📥 Resposta SuperPayBR Auth:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")
      console.log("Account ID:", authData.account)
      console.log("Working:", authData.working)
      console.log("Expires:", new Date(authData.expires_in * 1000).toLocaleString())

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
          error: `Erro na autenticação: ${authResponse.status} - ${errorText}`,
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
