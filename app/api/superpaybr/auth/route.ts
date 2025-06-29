import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("🔐 Iniciando autenticação SuperPayBR...")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      console.error("❌ Credenciais SuperPayBR não encontradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    // Criar Basic Auth header
    const credentials = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const response = await fetch("https://api.superpaybr.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        scope: "invoice.write,customer.write,webhook.write",
      }),
    })

    const data = await response.json()

    if (response.ok && data.access_token) {
      console.log("✅ Autenticação SuperPayBR realizada com sucesso")
      return NextResponse.json({
        success: true,
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
      })
    } else {
      console.error("❌ Erro na autenticação SuperPayBR:", data)
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: data,
        },
        { status: 401 },
      )
    }
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
