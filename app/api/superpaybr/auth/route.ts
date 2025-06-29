import { NextResponse } from "next/server"

// ⚠️ CACHE DE AUTENTICAÇÃO GLOBAL
let authCache: { token: string; expiresAt: number } | null = null

export async function GET() {
  try {
    // ✅ VERIFICAR CACHE VÁLIDO
    if (authCache && Date.now() < authCache.expiresAt) {
      console.log("✅ Token SuperPayBR obtido do cache")
      return NextResponse.json({
        success: true,
        token: authCache.token,
        source: "cache",
      })
    }

    console.log("🔐 Autenticando com SuperPayBR...")

    if (!process.env.SUPERPAYBR_TOKEN || !process.env.SUPERPAYBR_SECRET_KEY) {
      throw new Error("Variáveis de ambiente SuperPayBR não configuradas")
    }

    const authUrl = `${process.env.SUPERPAYBR_API_URL}/auth`

    const response = await fetch(authUrl, {
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

    const responseText = await response.text()
    console.log("📥 Resposta SuperPayBR Auth:", responseText.substring(0, 200))

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    let authResult
    try {
      authResult = JSON.parse(responseText)
    } catch (parseError) {
      throw new Error(`Erro ao parsear JSON: ${responseText}`)
    }

    if (authResult.success && authResult.token) {
      // ✅ SALVAR NO CACHE POR 50 MINUTOS
      authCache = {
        token: authResult.token,
        expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutos
      }

      console.log("✅ Autenticação SuperPayBR realizada com sucesso!")

      return NextResponse.json({
        success: true,
        token: authResult.token,
        source: "api",
      })
    } else {
      throw new Error(authResult.message || "Erro na autenticação SuperPayBR")
    }
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na autenticação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
