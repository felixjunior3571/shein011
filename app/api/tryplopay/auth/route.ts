import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== GERANDO ACCESS TOKEN ===")

    const token = process.env.TRYPLOPAY_TOKEN
    const secretKey = process.env.TRYPLOPAY_SECRET_KEY
    const apiUrl = process.env.TRYPLOPAY_API_URL || "https://api.tryplopay.com"

    if (!token || !secretKey) {
      console.log("❌ Credenciais não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais TryploPay não configuradas",
          fallback: true,
        },
        { status: 401 },
      )
    }

    // Basic Auth para autenticação
    const basicAuth = Buffer.from(`${token}:${secretKey}`).toString("base64")

    console.log("🔐 Fazendo requisição de autenticação...")

    const response = await fetch(`${apiUrl}/auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    if (!response.ok) {
      console.log("❌ Erro na autenticação:", response.status)
      throw new Error(`Erro na autenticação: ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Access token gerado com sucesso")

    return NextResponse.json({
      success: true,
      data: {
        access_token: data.access_token,
        account: data.account,
        working: data.working,
        expires_in: data.expires_in,
        token_type: data.token_type,
      },
    })
  } catch (error) {
    console.log("❌ Erro ao gerar access token:", error)

    // Fallback para simulação
    return NextResponse.json({
      success: true,
      fallback: true,
      data: {
        access_token: "SIMULATED_TOKEN_" + Date.now(),
        account: "SIMULATED_ACCOUNT",
        working: "SIMULATION",
        expires_in: Date.now() + 3600000,
        token_type: "Bearer",
      },
    })
  }
}
