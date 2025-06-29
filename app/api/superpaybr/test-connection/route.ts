import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Testando conexão SuperPayBR...")

    // Verificar variáveis de ambiente
    const requiredEnvVars = [
      "SUPERPAYBR_TOKEN",
      "SUPERPAYBR_SECRET_KEY",
      "SUPERPAYBR_API_URL",
      "SUPERPAYBR_WEBHOOK_URL",
    ]

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Variáveis de ambiente faltando: ${missingVars.join(", ")}`,
          env_status: "incomplete",
        },
        { status: 500 },
      )
    }

    // Testar autenticação
    const authResponse = await fetch(`${process.env.SUPERPAYBR_API_URL}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: process.env.SUPERPAYBR_TOKEN,
        secret: process.env.SUPERPAYBR_SECRET_KEY,
      }),
    })

    const authResult = await authResponse.json()

    if (authResult.success) {
      console.log("✅ Conexão SuperPayBR funcionando!")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR funcionando perfeitamente!",
        env_status: "complete",
        auth_status: "success",
        api_url: process.env.SUPERPAYBR_API_URL,
        webhook_url: process.env.SUPERPAYBR_WEBHOOK_URL,
        timestamp: new Date().toISOString(),
      })
    } else {
      throw new Error(authResult.message || "Erro na autenticação")
    }
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido no teste SuperPayBR",
        env_status: "unknown",
        auth_status: "failed",
      },
      { status: 500 },
    )
  }
}
