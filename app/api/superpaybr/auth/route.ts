import { type NextRequest, NextResponse } from "next/server"

// Cache do token em memória
let tokenCache: {
  token: string
  expires: number
} | null = null

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 === AUTENTICAÇÃO SUPERPAYBR ===")

    // Verificar se há token válido em cache
    if (tokenCache && tokenCache.expires > Date.now()) {
      console.log("✅ Token SuperPayBR válido em cache")
      return NextResponse.json({
        success: true,
        access_token: tokenCache.token,
        token: tokenCache.token,
        cached: true,
      })
    }

    // Obter credenciais das variáveis de ambiente
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    console.log("📋 Verificando credenciais SuperPayBR:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ NÃO DEFINIDO",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ NÃO DEFINIDO",
      apiUrl: apiUrl || "❌ NÃO DEFINIDO",
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
    const authResponse = await fetch(`${apiUrl}/auth`, {
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

    if (!authResponse.ok) {
      // Tentar método alternativo Basic Auth
      console.log("⚠️ Tentando método alternativo Basic Auth...")

      const basicAuth = Buffer.from(`${token}:${secretKey}`).toString("base64")
      const basicAuthResponse = await fetch(`${apiUrl}/auth`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })

      if (!basicAuthResponse.ok) {
        const errorText = await authResponse.text()
        throw new Error(`Erro de autenticação SuperPayBR: ${authResponse.status} - ${errorText}`)
      }

      const basicAuthData = await basicAuthResponse.json()
      const accessToken = basicAuthData.access_token || basicAuthData.token

      if (!accessToken) {
        throw new Error("Token de acesso não retornado pela SuperPayBR")
      }

      // Salvar no cache por 50 minutos
      tokenCache = {
        token: accessToken,
        expires: Date.now() + 50 * 60 * 1000,
      }

      console.log("✅ Autenticação SuperPayBR bem-sucedida (Basic Auth)")

      return NextResponse.json({
        success: true,
        access_token: accessToken,
        token: accessToken,
        method: "basic_auth",
      })
    }

    const authResult = await authResponse.json()
    const accessToken = authResult.access_token || authResult.token

    if (!accessToken) {
      throw new Error("Token de acesso não retornado pela SuperPayBR")
    }

    // Salvar no cache por 50 minutos
    tokenCache = {
      token: accessToken,
      expires: Date.now() + 50 * 60 * 1000,
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      access_token: accessToken,
      token: accessToken,
      method: "standard",
    })
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
    cached_token: tokenCache ? "Sim" : "Não",
    timestamp: new Date().toISOString(),
  })
}
