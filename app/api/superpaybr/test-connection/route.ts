import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function GET(request: NextRequest) {
  try {
    console.log("🔗 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Testar obtenção do access token
    const accessToken = await getSuperPayAccessToken()

    // Testar endpoint de status ou informações da conta
    const testUrls = [
      "https://api.superpaybr.com/v4/account",
      "https://api.superpaybr.com/account",
      "https://api.superpaybr.com/v4/status",
      "https://api.superpaybr.com/status",
    ]

    let testSuccess = false
    let responseData = null
    let lastError = null

    for (const testUrl of testUrls) {
      try {
        console.log(`🔄 Testando conexão em: ${testUrl}`)

        const testResponse = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        console.log(`📥 Resposta de ${testUrl}:`, {
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok,
        })

        if (testResponse.ok) {
          responseData = await testResponse.json()
          console.log("✅ Conexão testada com sucesso!")
          testSuccess = true
          break
        } else {
          const errorText = await testResponse.text()
          console.log(`❌ Falha em ${testUrl}:`, errorText)
          lastError = errorText
        }
      } catch (error) {
        console.log(`❌ Erro em ${testUrl}:`, error)
        lastError = error
      }
    }

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR testada com sucesso",
      authentication: "✅ Token obtido com sucesso",
      token_preview: accessToken.slice(0, 6) + "••••",
      api_test: testSuccess ? "✅ API respondendo" : "⚠️ API não testada",
      endpoint_tested: testSuccess ? testUrls.find((url, index) => index === 0) : null,
      response_preview: responseData ? "✅ Dados recebidos" : "⚠️ Sem dados de teste",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao testar conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao testar conexão SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
