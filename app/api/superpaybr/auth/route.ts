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

    const authResponse = await fetch("https://api.superpaybr.com/v4/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        secret_key: secretKey,
      }),
    })

    console.log("📥 Resposta autenticação SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR realizada com sucesso!")

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
