import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Credenciais SuperPayBR
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    if (!token || !secretKey || !apiUrl) {
      console.error("❌ Credenciais SuperPayBR não configuradas")
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

    console.log("📋 Testando conexão com:", {
      apiUrl,
      token: token ? `${token.substring(0, 10)}...` : "❌ AUSENTE",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ AUSENTE",
    })

    // Testar conectividade básica
    const testUrls = [`${apiUrl}/health`, `${apiUrl}/status`, `${apiUrl}/ping`, `${apiUrl}/auth`, `${apiUrl}`]

    let connectionSuccess = false
    let workingUrl = null
    let lastError = null

    for (const testUrl of testUrls) {
      try {
        console.log(`🔄 Testando conectividade: ${testUrl}`)

        const testResponse = await fetch(testUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })

        console.log(`📥 Resposta de ${testUrl}:`, {
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok,
        })

        if (testResponse.status < 500) {
          // Qualquer resposta que não seja erro 5xx indica conectividade
          connectionSuccess = true
          workingUrl = testUrl
          break
        }
      } catch (error) {
        console.log(`❌ Erro de conectividade em ${testUrl}:`, error)
        lastError = error
      }
    }

    if (connectionSuccess) {
      // Testar autenticação
      const credentials = `${token}:${secretKey}`
      const base64Credentials = Buffer.from(credentials).toString("base64")

      try {
        const authResponse = await fetch(`${apiUrl}/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${base64Credentials}`,
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
          }),
        })

        const authSuccess = authResponse.ok
        let authData = null

        if (authSuccess) {
          authData = await authResponse.json()
        }

        return NextResponse.json({
          success: true,
          message: "Conexão SuperPayBR testada com sucesso!",
          data: {
            connectivity: {
              success: true,
              working_url: workingUrl,
              tested_at: new Date().toISOString(),
            },
            authentication: {
              success: authSuccess,
              status: authResponse.status,
              has_token: !!(authData?.access_token || authData?.token),
            },
            api_info: {
              base_url: apiUrl,
              version: "v4",
              environment: process.env.NODE_ENV,
            },
          },
        })
      } catch (authError) {
        return NextResponse.json({
          success: true,
          message: "Conexão SuperPayBR OK, mas falha na autenticação",
          data: {
            connectivity: {
              success: true,
              working_url: workingUrl,
            },
            authentication: {
              success: false,
              error: authError instanceof Error ? authError.message : "Erro na autenticação",
            },
          },
        })
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na conectividade SuperPayBR",
          details: lastError,
          attempted_urls: testUrls,
        },
        { status: 503 },
      )
    }
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
