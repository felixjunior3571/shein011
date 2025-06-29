import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Testando conexão SuperPayBR...")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    // Verificar variáveis de ambiente
    const envCheck = {
      SUPERPAY_API_URL: !!apiUrl,
      SUPERPAY_TOKEN: !!token,
      SUPERPAY_SECRET_KEY: !!secretKey,
    }

    console.log("🔍 Verificação de variáveis:", envCheck)

    if (!apiUrl || !token || !secretKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente SuperPayBR não configuradas",
        env_check: envCheck,
      })
    }

    // Testar autenticação
    console.log("🔐 Testando autenticação...")

    const authResponse = await fetch(`${apiUrl}/v4/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: token,
        secret_key: secretKey,
      }),
    })

    const authResult = {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    }

    console.log("📥 Resultado da autenticação:", authResult)

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        auth_result: authResult,
        error_details: errorText,
        env_check: envCheck,
      })
    }

    const authData = await authResponse.json()

    console.log("✅ Conexão SuperPayBR testada com sucesso")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR funcionando",
      auth_result: authResult,
      has_access_token: !!authData.access_token,
      env_check: envCheck,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString(),
    })
  }
}
