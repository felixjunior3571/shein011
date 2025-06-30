import { NextResponse } from "next/server"

const SUPERPAYBR_API_URL = process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com"
const SUPERPAYBR_TOKEN = process.env.SUPERPAYBR_TOKEN
const SUPERPAYBR_SECRET_KEY = process.env.SUPERPAYBR_SECRET_KEY

export async function GET() {
  try {
    console.log("🔐 [SuperPayBR Auth] Iniciando autenticação...")

    if (!SUPERPAYBR_TOKEN || !SUPERPAYBR_SECRET_KEY) {
      console.log("❌ [SuperPayBR Auth] Credenciais não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 401 },
      )
    }

    console.log("🔧 [SuperPayBR Auth] Configurações:")
    console.log("- API URL:", SUPERPAYBR_API_URL)
    console.log("- Token configurado:", !!SUPERPAYBR_TOKEN)
    console.log("- Secret Key configurado:", !!SUPERPAYBR_SECRET_KEY)

    // Tentar autenticação na API SuperPayBR
    const authUrl = `${SUPERPAYBR_API_URL}/v1/auth/token`
    console.log("📡 [SuperPayBR Auth] URL de autenticação:", authUrl)

    try {
      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SHEIN-Card-System/1.0",
        },
        body: JSON.stringify({
          token: SUPERPAYBR_TOKEN,
          secret_key: SUPERPAYBR_SECRET_KEY,
        }),
      })

      console.log("📡 [SuperPayBR Auth] Resposta da autenticação:")
      console.log("- Status:", response.status)
      console.log("- Status Text:", response.statusText)

      if (response.ok) {
        const authData = await response.json()
        console.log("✅ [SuperPayBR Auth] Autenticação bem-sucedida")

        return NextResponse.json({
          success: true,
          data: authData,
          timestamp: new Date().toISOString(),
        })
      } else {
        const errorText = await response.text()
        console.log("❌ [SuperPayBR Auth] Erro na autenticação:", response.status, errorText)

        // Retornar token direto como fallback
        return NextResponse.json({
          success: true,
          data: {
            access_token: SUPERPAYBR_TOKEN,
            token_type: "Bearer",
            expires_in: 3600,
            fallback: true,
          },
          message: "Usando token direto como fallback",
          timestamp: new Date().toISOString(),
        })
      }
    } catch (fetchError) {
      console.log("❌ [SuperPayBR Auth] Erro na requisição de autenticação:", fetchError)

      // Retornar token direto como fallback
      return NextResponse.json({
        success: true,
        data: {
          access_token: SUPERPAYBR_TOKEN,
          token_type: "Bearer",
          expires_in: 3600,
          fallback: true,
        },
        message: "Usando token direto devido a erro de conexão",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Auth] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na autenticação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
