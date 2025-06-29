import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== AUTENTICAÇÃO SUPERPAYBR ===")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      console.log("❌ Credenciais SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            token: !token,
            secretKey: !secretKey,
          },
        },
        { status: 500 },
      )
    }

    console.log("🔑 Fazendo autenticação SuperPayBR...")

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    console.log("📥 Resposta da autenticação:", {
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
      console.log("❌ Erro na autenticação SuperPayBR:", errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro na autenticação SuperPayBR: ${authResponse.status}`,
          details: errorText,
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
      },
      { status: 500 },
    )
  }
}
