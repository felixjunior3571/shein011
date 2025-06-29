// Biblioteca de autenticação segura SuperPayBR
// Token é armazenado em memória e nunca exposto publicamente

interface SuperPayAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

interface TokenCache {
  token: string
  expires_at: number
}

// Cache em memória para o token (não persistente)
let tokenCache: TokenCache | null = null

export async function getSuperPayAccessToken(): Promise<string> {
  try {
    // Verificar se temos token válido em cache
    if (tokenCache && tokenCache.expires_at > Date.now()) {
      console.log("Token SuperPayBR válido encontrado no cache:", tokenCache.token.slice(0, 6) + "••••")
      return tokenCache.token
    }

    console.log("🔐 Gerando novo access_token SuperPayBR...")

    // Credenciais do ambiente
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = "https://api.superpaybr.com"

    if (!token || !secretKey) {
      throw new Error("Credenciais SuperPayBR não configuradas")
    }

    // Criar Basic Auth corretamente
    const credentials = `${token}:${secretKey}`
    const basicAuth = Buffer.from(credentials).toString("base64")

    console.log("🔑 Fazendo autenticação Basic Auth com SuperPayBR...")

    // URLs de autenticação para tentar
    const authUrls = [`${apiUrl}/auth`, `${apiUrl}/v4/auth`, `${apiUrl}/token`, `${apiUrl}/oauth/token`]

    let authSuccess = false
    let accessToken = null
    let lastError = null

    for (const authUrl of authUrls) {
      try {
        console.log(`🔄 Tentando autenticação em: ${authUrl}`)

        const authResponse = await fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
            scope: "invoice.write customer.write webhook.write payment.read",
          }),
        })

        if (authResponse.ok) {
          const authData: SuperPayAuthResponse = await authResponse.json()
          accessToken = authData.access_token
          console.log("✅ Access token obtido:", accessToken ? accessToken.slice(0, 6) + "••••" : "❌ NULO")

          if (accessToken) {
            authSuccess = true
            break
          }
        } else {
          const errorText = await authResponse.text()
          console.log(`❌ Falha em ${authUrl}:`, errorText)
          lastError = errorText
        }
      } catch (error) {
        console.log(`❌ Erro em ${authUrl}:`, error)
        lastError = error
      }
    }

    if (!authSuccess || !accessToken) {
      console.error("❌ Falha na autenticação SuperPayBR:", lastError)
      throw new Error(`Falha na autenticação SuperPayBR: ${lastError}`)
    }

    // Armazenar token em cache com expiração
    const expiresIn = 3600 // 1 hora padrão
    tokenCache = {
      token: accessToken,
      expires_at: Date.now() + (expiresIn - 60) * 1000, // 1 minuto antes da expiração
    }

    console.log("✅ Access token SuperPayBR gerado com sucesso:", accessToken.slice(0, 6) + "••••")
    console.log("⏰ Token expira em:", expiresIn, "segundos")

    // Retornar token completo para uso interno
    return accessToken
  } catch (error) {
    console.error("❌ Erro ao obter access token SuperPayBR:", error)
    throw error
  }
}

export function clearTokenCache(): void {
  tokenCache = null
  console.log("🗑️ Cache de token SuperPayBR limpo")
}

export function isTokenCached(): boolean {
  return tokenCache !== null && tokenCache.expires_at > Date.now()
}
