import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== TESTE DE CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    console.log("🔍 Verificando credenciais SuperPayBR...")
    console.log("Token presente:", !!token)
    console.log("Secret Key presente:", !!secretKey)

    if (!token || !secretKey) {
      return NextResponse.json({
        success: false,
        error: "Credenciais SuperPayBR não configuradas",
        details: {
          token_present: !!token,
          secret_key_present: !!secretKey,
        },
      })
    }

    // Testar autenticação
    console.log("🔑 Testando autenticação SuperPayBR...")

    const authResponse = await fetch("https://api.superpaybr.com/v4/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        secret_key: secretKey,
      }),
    })

    console.log("📥 Resposta autenticação:", {
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
        auth_data: {
          access_token_present: !!authData.access_token,
          expires_in: authData.expires_in,
          token_type: authData.token_type,
        },
        test_timestamp: new Date().toISOString(),
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação:", authResponse.status, errorText)

      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        details: {
          status: authResponse.status,
          statusText: authResponse.statusText,
          error: errorText,
        },
      })
    }
  } catch (error) {
    console.log("❌ Erro no teste de conexão:", error)
    return NextResponse.json({
      success: false,
      error: "Erro interno no teste de conexão",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
