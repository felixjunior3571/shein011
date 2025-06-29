import { NextResponse } from "next/server"

// ⚠️ CACHE de autenticação para evitar múltiplas requisições
let authCache: { token: string; expiresAt: number } | null = null

export async function GET() {
  try {
    // ⚠️ VERIFICAR cache primeiro
    if (authCache && Date.now() < authCache.expiresAt) {
      console.log("📦 Retornando token do cache SuperPayBR")
      return NextResponse.json({
        success: true,
        token: authCache.token,
        cached: true,
      })
    }

    console.log("🔐 Autenticando com SuperPayBR...")

    const authUrl = `${process.env.SUPERPAYBR_API_URL}/auth`
    const authData = {
      email: "contato@sheincard.com.br",
      password: process.env.SUPERPAYBR_SECRET_KEY,
    }

    console.log("🌐 URL de autenticação:", authUrl)

    // ⚠️ TIMEOUT para evitar requisições travadas
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 segundos

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
    console.log("📥 Resposta SuperPayBR Auth:", responseText.substring(0, 200))

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      throw new Error(`Erro ao parsear JSON: ${responseText}`)
    }

    if (data.success && data.data?.token) {
      // ⚠️ SALVAR no cache por 45 minutos
      authCache = {
        token: data.data.token,
        expiresAt: Date.now() + 45 * 60 * 1000, // 45 minutos
      }

      console.log("✅ Autenticação SuperPayBR bem-sucedida")
      return NextResponse.json({
        success: true,
        token: data.data.token,
        cached: false,
      })
    } else {
      throw new Error(data.message || "Token não encontrado na resposta")
    }
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)

    // ⚠️ LIMPAR cache em caso de erro
    authCache = null

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na autenticação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
