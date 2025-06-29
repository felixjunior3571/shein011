import { type NextRequest, NextResponse } from "next/server"

// Cache de token para evitar múltiplas autenticações
let tokenCache: { token: string; expires: number } | null = null

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 === INICIANDO AUTENTICAÇÃO SUPERPAYBR ===")

    // Verificar cache de token
    if (tokenCache && tokenCache.expires > Date.now()) {
      console.log("✅ Token SuperPayBR válido em cache")
      return NextResponse.json({
        success: true,
        access_token: tokenCache.token,
        message: "Token SuperPayBR obtido do cache",
        expires_in: Math.floor((tokenCache.expires - Date.now()) / 1000),
      })
    }

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY
    const apiUrl = process.env.SUPERPAYBR_API_URL

    console.log("📋 Verificando credenciais SuperPayBR:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ Não configurado",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ Não configurado",
      apiUrl: apiUrl || "❌ Não configurado",
    })

    if (!token || !secretKey || !apiUrl) {
      throw new Error("Credenciais SuperPayBR não configuradas")
    }

    // Preparar dados de autenticação
    const authData = {
      token: token,
      secret: secretKey,
    }

    console.log("📤 Enviando requisição de autenticação SuperPayBR...")

    // Fazer requisição de autenticação
    const authResponse = await fetch(`${apiUrl}/v4/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify(authData),
    })

    console.log("📥 Resposta da autenticação SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authResult = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")

      // Extrair token da resposta
      const accessToken = authResult.access_token || authResult.token || authResult.data?.access_token

      if (!accessToken) {
        throw new Error("Token de acesso não encontrado na resposta SuperPayBR")
      }

      // Salvar no cache por 50 minutos
      tokenCache = {
        token: accessToken,
        expires: Date.now() + 50 * 60 * 1000, // 50 minutos
      }

      console.log("💾 Token SuperPayBR salvo em cache por 50 minutos")

      return NextResponse.json({
        success: true,
        access_token: accessToken,
        message: "Autenticação SuperPayBR realizada com sucesso",
        expires_in: 3000, // 50 minutos em segundos
        account: authResult.account || authResult.data?.account || {},
      })
    } else {
      const errorText = await authResponse.text()
      console.error("❌ Erro na autenticação SuperPayBR:", {
        status: authResponse.status,
        error: errorText,
      })

      // Tentar método alternativo se der 401
      if (authResponse.status === 401) {
        console.log("🔄 Tentando método de autenticação alternativo...")

        const altAuthResponse = await fetch(`${apiUrl}/v4/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
            "User-Agent": "SHEIN-Card-System/1.0",
          },
        })

        if (altAuthResponse.ok) {
          const altAuthResult = await altAuthResponse.json()
          const altAccessToken = altAuthResult.access_token || altAuthResult.token || altAuthResult.data?.access_token

          if (altAccessToken) {
            tokenCache = {
              token: altAccessToken,
              expires: Date.now() + 50 * 60 * 1000,
            }

            console.log("✅ Autenticação SuperPayBR alternativa bem-sucedida!")

            return NextResponse.json({
              success: true,
              access_token: altAccessToken,
              message: "Autenticação SuperPayBR alternativa realizada com sucesso",
              expires_in: 3000,
              method: "alternative",
            })
          }
        }
      }

      throw new Error(`Erro SuperPayBR ${authResponse.status}: ${errorText}`)
    }
  } catch (error) {
    console.error("❌ Erro ao autenticar SuperPayBR:", error)
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
    cache_status: tokenCache ? "active" : "empty",
    cache_expires: tokenCache ? new Date(tokenCache.expires).toISOString() : null,
  })
}
