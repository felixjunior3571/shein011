import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== TESTANDO CONEXÃO SUPERPAYBR ===")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            token: !token,
            secret_key: !secretKey,
          },
        },
        { status: 500 },
      )
    }

    console.log("🔐 Testando autenticação SuperPayBR...")

    // Criar Basic Auth header
    const credentials = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        scope: "invoice.write customer.write webhook.write",
      }),
    })

    console.log("📥 Resposta teste SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Conexão SuperPayBR funcionando!")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR funcionando perfeitamente!",
        data: {
          token_type: authData.token_type,
          expires_in: authData.expires_in,
          scope: authData.scope,
        },
        timestamp: new Date().toISOString(),
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na conexão SuperPayBR:", authResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR ${authResponse.status}: ${errorText}`,
          status_code: authResponse.status,
        },
        { status: authResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro ao testar conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao testar conexão SuperPayBR",
      },
      { status: 500 },
    )
  }
}
