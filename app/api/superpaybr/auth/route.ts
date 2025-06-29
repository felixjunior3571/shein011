import { type NextRequest, NextResponse } from "next/server"

// Cache global para o token
let tokenCache: {
  token: string
  expiresAt: number
} | null = null

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 === AUTENTICAÇÃO SUPERPAYBR ===")

    // Verificar se há token em cache válido
    if (tokenCache && tokenCache.expiresAt > Date.now()) {
      console.log("✅ Token SuperPayBR em cache ainda válido")
      return NextResponse.json({
        success: true,
        access_token: tokenCache.token,
        cached: true,
      })
    }

    // Obter credenciais do ambiente
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    console.log("📋 Verificando credenciais SuperPayBR:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ AUSENTE",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ AUSENTE",
      apiUrl: apiUrl || "❌ AUSENTE",
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
    const authUrl = `${apiUrl}/auth`
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify(authData),
    })

    console.log("📥 Resposta da autenticação SuperPayBR:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro na autenticação SuperPayBR:", errorText)
      throw new Error(`Erro de autenticação SuperPayBR: ${response.status} - ${errorText}`)
    }

    const authResult = await response.json()
    console.log("📋 Resultado da autenticação:", {
      success: !!authResult.access_token,
      hasToken: !!authResult.access_token,
    })

    if (!authResult.access_token) {
      throw new Error("Token de acesso não retornado pela SuperPayBR")
    }

    // Armazenar token em cache por 50 minutos
    tokenCache = {
      token: authResult.access_token,
      expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutos
    }

    console.log("✅ Autenticação SuperPayBR realizada com sucesso!")

    return NextResponse.json({
      success: true,
      access_token: authResult.access_token,
      expires_in: 3000, // 50 minutos em segundos
      cached: false,
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
    cached_token: !!tokenCache && tokenCache.expiresAt > Date.now(),
    timestamp: new Date().toISOString(),
  })
}
