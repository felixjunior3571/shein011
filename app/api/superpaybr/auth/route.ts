import { NextResponse } from "next/server"

// ⚠️ CACHE DE AUTENTICAÇÃO GLOBAL
let authCache: { token: string; expiresAt: number } | null = null

export async function POST() {
  try {
    console.log("🔐 Iniciando autenticação SuperPayBR...")

    // ✅ VERIFICAR CACHE VÁLIDO
    if (authCache && Date.now() < authCache.expiresAt) {
      console.log("✅ Token SuperPayBR obtido do cache")
      return NextResponse.json({
        success: true,
        token: authCache.token,
        source: "cache",
      })
    }

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      console.error("❌ Credenciais SuperPayBR não encontradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    console.log("📋 Credenciais encontradas:", {
      token: token.substring(0, 10) + "...",
      secret: secretKey.substring(0, 10) + "...",
    })

    // ✅ AUTENTICAÇÃO CORRETA SUPERPAYBR
    const authResponse = await fetch(`${process.env.SUPERPAYBR_API_URL}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: token,
        secret: secretKey,
      }),
    })

    console.log("📥 Resposta autenticação SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    const responseText = await authResponse.text()
    console.log("📄 Resposta completa:", responseText.substring(0, 500))

    if (authResponse.ok) {
      let authData
      try {
        authData = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Erro ao parsear JSON:", parseError)
        throw new Error(`Resposta inválida da API: ${responseText}`)
      }

      if (authData.success && authData.token) {
        // ✅ SALVAR NO CACHE POR 50 MINUTOS
        authCache = {
          token: authData.token,
          expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutos
        }

        console.log("✅ Autenticação SuperPayBR realizada com sucesso!")

        return NextResponse.json({
          success: true,
          token: authData.token,
          source: "api",
        })
      } else {
        throw new Error(authData.message || "Token não recebido da API SuperPayBR")
      }
    } else {
      console.error("❌ Erro na autenticação SuperPayBR:", authResponse.status, responseText)
      throw new Error(`Erro SuperPayBR ${authResponse.status}: ${responseText}`)
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

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Auth endpoint ativo",
    timestamp: new Date().toISOString(),
    cache_status: authCache ? "cached" : "empty",
    cache_expires: authCache ? new Date(authCache.expiresAt).toISOString() : null,
  })
}
