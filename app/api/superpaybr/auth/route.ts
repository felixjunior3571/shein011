import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("🔐 === AUTENTICAÇÃO SUPERPAYBR ===")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!apiUrl || !token || !secretKey) {
      console.log("❌ Variáveis de ambiente SuperPayBR não configuradas")
      throw new Error("Variáveis de ambiente SuperPayBR não configuradas")
    }

    console.log("🌐 Fazendo autenticação SuperPayBR...")
    console.log("URL:", `${apiUrl}/v4/auth`)

    const authResponse = await fetch(`${apiUrl}/v4/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify({
        token: token,
        secret_key: secretKey,
      }),
    })

    console.log("📥 Resposta da autenticação:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação SuperPayBR:", errorText)
      throw new Error(`Erro de autenticação SuperPayBR: ${authResponse.status} - ${errorText}`)
    }

    const authData = await authResponse.json()
    console.log("✅ Autenticação SuperPayBR bem-sucedida")
    console.log("🔑 Token obtido:", authData.access_token ? "✅ PRESENTE" : "❌ AUSENTE")

    return NextResponse.json({
      success: true,
      access_token: authData.access_token,
      token_type: authData.token_type || "Bearer",
      expires_in: authData.expires_in || 3600,
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na autenticação",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Auth endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
