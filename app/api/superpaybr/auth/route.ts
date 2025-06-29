import { NextResponse } from "next/server"

// Cache de autenticação global
let authCache: { token: string; expires: number } | null = null

export async function POST() {
  try {
    console.log("🔐 === INICIANDO AUTENTICAÇÃO SUPERPAYBR ===")

    // Verificar cache válido primeiro
    if (authCache && Date.now() < authCache.expires) {
      console.log("✅ Token SuperPayBR obtido do cache")
      return NextResponse.json({
        success: true,
        access_token: authCache.token,
        source: "cache",
      })
    }

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY
    const apiUrl = process.env.SUPERPAYBR_API_URL

    console.log("📋 Verificando credenciais SuperPayBR:", {
      token: token ? `${token.substring(0, 8)}...` : "❌ NÃO ENCONTRADO",
      secretKey: secretKey ? `${secretKey.substring(0, 20)}...` : "❌ NÃO ENCONTRADO",
      apiUrl: apiUrl || "❌ NÃO ENCONTRADO",
    })

    if (!token || !secretKey || !apiUrl) {
      console.error("❌ Credenciais SuperPayBR não encontradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            token: !token,
            secretKey: !secretKey,
            apiUrl: !apiUrl,
          },
        },
        { status: 500 },
      )
    }

    // Tentar múltiplos métodos de autenticação
    console.log("🔄 Tentando autenticação SuperPayBR...")

    // Método 1: Basic Auth (padrão)
    const credentials = Buffer.from(`${token}:${secretKey}`).toString("base64")

    console.log("📤 Enviando requisição de autenticação:", {
      url: `${apiUrl}/auth`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    })

    const authResponse = await fetch(`${apiUrl}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify({
        scope: "invoice.write customer.write webhook.write",
      }),
    })

    console.log("📥 Resposta da autenticação SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
      headers: Object.fromEntries(authResponse.headers.entries()),
    })

    const responseText = await authResponse.text()
    console.log("📄 Resposta completa:", responseText.substring(0, 1000))

    if (!authResponse.ok) {
      console.error("❌ Erro na autenticação SuperPayBR:", {
        status: authResponse.status,
        statusText: authResponse.statusText,
        response: responseText,
      })

      // Tentar método alternativo se 401
      if (authResponse.status === 401) {
        console.log("🔄 Tentando método alternativo de autenticação...")

        // Método 2: Token direto no header
        const altResponse = await fetch(`${apiUrl}/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            secret: secretKey,
          }),
        })

        const altResponseText = await altResponse.text()
        console.log("📥 Resposta método alternativo:", {
          status: altResponse.status,
          response: altResponseText.substring(0, 500),
        })

        if (altResponse.ok) {
          let authData
          try {
            authData = JSON.parse(altResponseText)
          } catch (parseError) {
            console.error("❌ Erro ao parsear JSON alternativo:", parseError)
            throw new Error(`Resposta inválida: ${altResponseText}`)
          }

          if (authData.access_token) {
            // Salvar no cache por 50 minutos
            authCache = {
              token: authData.access_token,
              expires: Date.now() + 50 * 60 * 1000,
            }

            console.log("✅ Autenticação SuperPayBR bem-sucedida (método alternativo)!")
            return NextResponse.json({
              success: true,
              access_token: authData.access_token,
              token_type: authData.token_type || "Bearer",
              expires_in: authData.expires_in || 3600,
              method: "alternative",
            })
          }
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: `Erro de autenticação SuperPayBR: ${authResponse.status}`,
          details: responseText,
          status: authResponse.status,
        },
        { status: authResponse.status },
      )
    }

    // Parse da resposta de sucesso
    let authData
    try {
      authData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("❌ Erro ao parsear JSON:", parseError)
      throw new Error(`Resposta inválida da API: ${responseText}`)
    }

    console.log("📊 Dados de autenticação recebidos:", {
      access_token: authData.access_token ? "✅ PRESENTE" : "❌ AUSENTE",
      token_type: authData.token_type || "N/A",
      expires_in: authData.expires_in || "N/A",
    })

    if (!authData.access_token) {
      throw new Error("Token de acesso não recebido da API SuperPayBR")
    }

    // Salvar no cache por 50 minutos
    authCache = {
      token: authData.access_token,
      expires: Date.now() + 50 * 60 * 1000,
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida!")

    return NextResponse.json({
      success: true,
      access_token: authData.access_token,
      token_type: authData.token_type || "Bearer",
      expires_in: authData.expires_in || 3600,
      method: "standard",
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na autenticação SuperPayBR",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Auth endpoint ativo",
    cache_status: authCache ? "cached" : "empty",
    cache_expires: authCache ? new Date(authCache.expires).toISOString() : null,
    credentials: {
      token: process.env.SUPERPAYBR_TOKEN ? "✅ Configurado" : "❌ Não encontrado",
      secret: process.env.SUPERPAYBR_SECRET_KEY ? "✅ Configurado" : "❌ Não encontrado",
      api_url: process.env.SUPERPAYBR_API_URL || "❌ Não encontrado",
      webhook_url: process.env.SUPERPAYBR_WEBHOOK_URL || "❌ Não encontrado",
    },
    timestamp: new Date().toISOString(),
  })
}
