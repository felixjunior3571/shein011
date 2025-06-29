import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== AUTENTICAÇÃO SUPERPAYBR ===")

    // Credenciais fornecidas
    const token = "ykt9tPrVpDSyWyZ"
    const secretKey = "eWt0OXRQclZwRFN5V3laOjoxNzM0OTExODcxMA=="

    console.log("🔑 Fazendo autenticação SuperPayBR...")
    console.log("Token:", token)
    console.log("Secret Key:", secretKey.substring(0, 20) + "...")

    // Criar Basic Auth header
    const credentials = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "POST",
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
      console.log("Access Token:", authData.access_token?.substring(0, 20) + "...")
      console.log("Token Type:", authData.token_type)

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
        details: error instanceof Error ? error.message : "Erro desconhecido",
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
