import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== AUTENTICAÇÃO SUPERPAYBR ===")

    // Credenciais SuperPayBR conforme especificação
    const token = process.env.SUPERPAYBR_TOKEN || "ykt9tPrVpDSyWyZ"
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY || "eWt0OXRQclZwRFN5V3laOjoxNzM0OTExODcxMA=="

    console.log("🔑 Fazendo autenticação SuperPayBR...")

    // Fazer requisição de autenticação usando Basic Auth
    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        scope: "invoice.write customer.write webhook.write",
      }),
    })

    console.log("📥 Resposta autenticação SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")

      return NextResponse.json({
        success: true,
        data: authData,
        message: "Autenticação SuperPayBR realizada com sucesso",
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação SuperPayBR:", authResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro de autenticação SuperPayBR: ${authResponse.status} - ${errorText}`,
        },
        { status: authResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na autenticação SuperPayBR",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Auth endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
