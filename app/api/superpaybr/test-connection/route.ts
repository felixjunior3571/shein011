import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Testando conexão SuperPayBR...")

    // Verificar variáveis de ambiente
    const requiredEnvs = ["SUPERPAYBR_API_URL", "SUPERPAYBR_TOKEN", "SUPERPAYBR_SECRET_KEY"]
    const missingEnvs = requiredEnvs.filter((env) => !process.env[env])

    if (missingEnvs.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Variáveis de ambiente ausentes: ${missingEnvs.join(", ")}`,
        env_status: {
          SUPERPAYBR_API_URL: !!process.env.SUPERPAYBR_API_URL,
          SUPERPAYBR_TOKEN: !!process.env.SUPERPAYBR_TOKEN,
          SUPERPAYBR_SECRET_KEY: !!process.env.SUPERPAYBR_SECRET_KEY,
        },
      })
    }

    // ⚠️ TIMEOUT para evitar requisições travadas
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos

    // Testar autenticação
    const authUrl = `${process.env.SUPERPAYBR_API_URL}/auth`
    const authData = {
      email: "contato@sheincard.com.br",
      password: process.env.SUPERPAYBR_SECRET_KEY,
    }

    console.log("🔐 Testando autenticação SuperPayBR...")
    console.log("🌐 URL:", authUrl)

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.SUPERPAYBR_TOKEN}`,
      },
      body: JSON.stringify(authData),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseText = await response.text()
    console.log("📥 Resposta SuperPayBR:", responseText.substring(0, 200))

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        response_preview: responseText.substring(0, 500),
        env_status: {
          SUPERPAYBR_API_URL: !!process.env.SUPERPAYBR_API_URL,
          SUPERPAYBR_TOKEN: !!process.env.SUPERPAYBR_TOKEN,
          SUPERPAYBR_SECRET_KEY: !!process.env.SUPERPAYBR_SECRET_KEY,
        },
      })
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: `Erro ao parsear JSON: ${parseError}`,
        response_preview: responseText.substring(0, 500),
      })
    }

    if (data.success && data.data?.token) {
      console.log("✅ Conexão SuperPayBR bem-sucedida!")
      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR funcionando!",
        token_preview: data.data.token.substring(0, 20) + "...",
        env_status: {
          SUPERPAYBR_API_URL: !!process.env.SUPERPAYBR_API_URL,
          SUPERPAYBR_TOKEN: !!process.env.SUPERPAYBR_TOKEN,
          SUPERPAYBR_SECRET_KEY: !!process.env.SUPERPAYBR_SECRET_KEY,
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.message || "Token não encontrado na resposta",
        response_data: data,
      })
    }
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      env_status: {
        SUPERPAYBR_API_URL: !!process.env.SUPERPAYBR_API_URL,
        SUPERPAYBR_TOKEN: !!process.env.SUPERPAYBR_TOKEN,
        SUPERPAYBR_SECRET_KEY: !!process.env.SUPERPAYBR_SECRET_KEY,
      },
    })
  }
}
