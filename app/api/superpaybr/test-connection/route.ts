import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== TESTE DE CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
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

    console.log("✅ Credenciais encontradas")
    console.log("Token:", token.substring(0, 10) + "...")
    console.log("Secret:", secretKey.substring(0, 20) + "...")

    // Testar autenticação
    const authResponse = await fetch("https://api.superpaybr.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
      }),
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Autenticação bem-sucedida")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR estabelecida com sucesso",
        data: {
          token_type: authData.token_type,
          expires_in: authData.expires_in,
          scope: authData.scope,
        },
        credentials_ok: true,
        api_accessible: true,
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação:", authResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: {
            status: authResponse.status,
            statusText: authResponse.statusText,
            response: errorText,
          },
          credentials_ok: false,
          api_accessible: true,
        },
        { status: authResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro no teste de conexão:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro de conectividade com SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        credentials_ok: true,
        api_accessible: false,
      },
      { status: 500 },
    )
  }
}
