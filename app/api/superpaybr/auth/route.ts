import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("🔐 Iniciando autenticação SuperPayBR...")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!apiUrl || !token || !secretKey) {
      console.error("❌ Variáveis de ambiente SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Configuração SuperPayBR incompleta",
        },
        { status: 500 },
      )
    }

    const authResponse = await fetch(`${apiUrl}/v4/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: token,
        secret_key: secretKey,
      }),
    })

    if (!authResponse.ok) {
      console.error("❌ Falha na autenticação SuperPayBR:", authResponse.status)
      return NextResponse.json(
        {
          success: false,
          error: `Erro de autenticação: ${authResponse.status}`,
        },
        { status: authResponse.status },
      )
    }

    const authData = await authResponse.json()
    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      access_token: authData.access_token,
      expires_in: authData.expires_in,
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
