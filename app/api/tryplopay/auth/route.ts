import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== GERANDO ACCESS TOKEN ===")

    const token = process.env.TRYPLOPAY_TOKEN
    const secretKey = process.env.TRYPLOPAY_SECRET_KEY
    const apiUrl = process.env.TRYPLOPAY_API_URL || "https://api.tryplopay.com"

    if (!token || !secretKey) {
      console.log("⚠️ Credenciais não configuradas, usando simulação")
      return NextResponse.json({
        success: true,
        data: {
          access_token: "simulated_token",
          account: "simulated_account",
          working: "SIMULATION",
        },
        fallback: true,
      })
    }

    // Basic Auth conforme documentação TryploPay
    const basicAuth = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const response = await fetch(`${apiUrl}/auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    if (!response.ok) {
      throw new Error(`Erro na autenticação: ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Access token obtido com sucesso")
    console.log("Working:", data.working)

    return NextResponse.json({
      success: true,
      data: {
        access_token: data.access_token,
        account: data.account,
        working: data.working,
        expires_in: data.expires_in,
      },
    })
  } catch (error) {
    console.log("❌ Erro na autenticação, usando simulação:", error)

    return NextResponse.json({
      success: true,
      data: {
        access_token: "simulated_token",
        account: "simulated_account",
        working: "SIMULATION",
      },
      fallback: true,
    })
  }
}
