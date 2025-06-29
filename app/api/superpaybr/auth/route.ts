import { NextResponse } from "next/server"

// ⚠️ CACHE para token de autenticação
let authCache: { token: string; expires: number } | null = null

export async function POST() {
  try {
    console.log("🔐 Iniciando autenticação SuperPayBR...")

    // ⚠️ VERIFICAR cache do token primeiro
    if (authCache && Date.now() < authCache.expires) {
      console.log("📦 Retornando token do cache SuperPayBR")
      return NextResponse.json({
        success: true,
        data: {
          access_token: authCache.token,
          token_type: "Bearer",
        },
        message: "Token do cache SuperPayBR",
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

    // Criar Basic Auth header
    const credentials = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        scope: "invoice.write customer.write webhook.write",
      }),
    })

    console.log("📥 Resposta autenticação SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")

      // ⚠️ SALVAR no cache (válido por 50 minutos)
      authCache = {
        token: authData.access_token,
        expires: Date.now() + 50 * 60 * 1000, // 50 minutos
      }

      return NextResponse.json({
        success: true,
        data: authData,
        message: "Autenticação SuperPayBR realizada com sucesso",
      })
    } else {
      const errorText = await authResponse.text()
      console.error("❌ Erro na autenticação SuperPayBR:", authResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR ${authResponse.status}: ${errorText}`,
        },
        { status: authResponse.status },
      )
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
  })
}
