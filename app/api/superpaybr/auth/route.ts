import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Autenticando com SuperPayBR...")

    if (!process.env.SUPERPAYBR_TOKEN || !process.env.SUPERPAYBR_SECRET_KEY) {
      console.log("❌ Credenciais SuperPayBR não configuradas")
      return NextResponse.json({ success: false, error: "Credenciais não configuradas" }, { status: 500 })
    }

    const authData = {
      token: process.env.SUPERPAYBR_TOKEN,
      secret: process.env.SUPERPAYBR_SECRET_KEY,
    }

    console.log("📤 Enviando credenciais para SuperPayBR...")

    const response = await fetch("https://api.superpaybr.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(authData),
    })

    const data = await response.json()

    if (response.ok && data.access_token) {
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")
      return NextResponse.json({
        success: true,
        data: {
          access_token: data.access_token,
          token_type: data.token_type || "Bearer",
          expires_in: data.expires_in || 3600,
        },
      })
    } else {
      console.log("❌ Falha na autenticação SuperPayBR:", data)
      return NextResponse.json(
        { success: false, error: "Falha na autenticação", details: data },
        { status: response.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json({ success: false, error: "Erro interno de autenticação" }, { status: 500 })
  }
}
