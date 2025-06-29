import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTANDO CONEXÃO SUPERPAYBR ===")

    // Testar autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authResult = await authResponse.json()

    if (authResult.success) {
      console.log("✅ Conexão SuperPayBR funcionando!")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR estabelecida com sucesso",
        data: {
          auth_status: "success",
          api_url: "https://api.superpaybr.com",
          webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
          timestamp: new Date().toISOString(),
        },
      })
    } else {
      throw new Error(`Falha na autenticação: ${authResult.error}`)
    }
  } catch (error) {
    console.log("❌ Erro na conexão SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na conexão SuperPayBR",
        data: {
          auth_status: "failed",
          api_url: "https://api.superpaybr.com",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    )
  }
}
