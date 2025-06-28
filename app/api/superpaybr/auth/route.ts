import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔐 Iniciando autenticação SuperPayBR...")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      console.log("❌ Credenciais SuperPayBR não encontradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        secret_key: secretKey,
      }),
    })

    if (!authResponse.ok) {
      throw new Error(`HTTP error! status: ${authResponse.status}`)
    }

    const authData = await authResponse.json()

    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      data: authData,
    })
  } catch (error) {
    console.log("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Falha na autenticação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
