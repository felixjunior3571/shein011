import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔧 Testando conexão SuperPayBR...")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          details: {
            token_exists: !!token,
            secret_key_exists: !!secretKey,
          },
        },
        { status: 500 },
      )
    }

    // Testar autenticação
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
      console.log("✅ Conexão SuperPayBR OK")
      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR funcionando",
        details: {
          status: response.status,
          token_type: data.token_type,
          expires_in: data.expires_in,
        },
      })
    } else {
      console.error("❌ Falha na conexão SuperPayBR:", data)
      return NextResponse.json(
        {
          success: false,
          error: "Falha na conexão SuperPayBR",
          details: {
            status: response.status,
            response: data,
          },
        },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("❌ Erro ao testar conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao testar conexão SuperPayBR",
      },
      { status: 500 },
    )
  }
}
