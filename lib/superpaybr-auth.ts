// Cache em memória para o token SuperPayBR
let tokenCache: {
  access_token: string
  expires_at: number
} | null = null

// Função para obter access token SuperPayBR com cache
export async function getSuperPayAccessToken(): Promise<string> {
  // Verificar se o token em cache ainda é válido
  if (tokenCache && Date.now() < tokenCache.expires_at) {
    console.log("🔄 Usando token SuperPayBR do cache")
    return tokenCache.access_token
  }

  console.log("🔑 Obtendo novo token SuperPayBR...")

  const token = process.env.SUPERPAY_TOKEN
  const secretKey = process.env.SUPERPAY_SECRET_KEY

  if (!token || !secretKey) {
    throw new Error("Credenciais SuperPayBR não configuradas (SUPERPAY_TOKEN e SUPERPAY_SECRET_KEY)")
  }

  try {
    // Fazer autenticação Basic Auth
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${base64Credentials}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      throw new Error(`Falha na autenticação SuperPayBR: ${authResponse.status} - ${errorText}`)
    }

    const authData = await authResponse.json()

    if (!authData.access_token) {
      throw new Error("Access token não retornado pela API SuperPayBR")
    }

    // Calcular tempo de expiração (12 meses conforme documentação, mas usar 11 meses para segurança)
    const expiresIn = authData.expires_in || 11 * 30 * 24 * 60 * 60 // 11 meses em segundos
    const expiresAt = Date.now() + expiresIn * 1000

    // Armazenar no cache
    tokenCache = {
      access_token: authData.access_token,
      expires_at: expiresAt,
    }

    console.log("✅ Token SuperPayBR obtido com sucesso")
    console.log(`⏰ Token expira em: ${new Date(expiresAt).toISOString()}`)

    return authData.access_token
  } catch (error) {
    console.error("❌ Erro ao obter token SuperPayBR:", error)
    throw error
  }
}

// Função para limpar o cache do token
export function clearTokenCache(): void {
  tokenCache = null
  console.log("🗑️ Cache do token SuperPayBR limpo")
}

// Função para verificar se o token está válido
export function isTokenValid(): boolean {
  return tokenCache !== null && Date.now() < tokenCache.expires_at
}

// Função para obter informações do token em cache
export function getTokenInfo(): { hasToken: boolean; expiresAt: string | null; isValid: boolean } {
  return {
    hasToken: tokenCache !== null,
    expiresAt: tokenCache ? new Date(tokenCache.expires_at).toISOString() : null,
    isValid: isTokenValid(),
  }
}
