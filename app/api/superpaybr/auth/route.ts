import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔐 Testando autenticação SuperPayBR...")

    // Verificar variáveis de ambiente
    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!apiUrl || !token || !secretKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente SuperPayBR não configuradas",
        details: {
          hasApiUrl: !!apiUrl,
          hasToken: !!token,
          hasSecretKey: !!secretKey,
        },
      })
    }

    console.log("✅ Variáveis de ambiente encontradas")
    console.log("🌐 URL da API:", apiUrl)

    // Testar diferentes endpoints de autenticação
    const authEndpoints = [
      `${apiUrl}/auth`,
      `${apiUrl}/authenticate`,
      `${apiUrl}/login`,
      `${apiUrl}/token`,
      `${apiUrl}/api/auth`,
      `${apiUrl}/v1/auth`,
    ]

    let authSuccess = false
    let authResponse = null
    let workingEndpoint = null

    for (const endpoint of authEndpoints) {
      try {
        console.log(`🔍 Testando endpoint: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-Key": secretKey,
          },
          body: JSON.stringify({
            token: token,
            secret: secretKey,
          }),
        })

        console.log(`📊 Status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log("✅ Autenticação bem-sucedida!")
          authSuccess = true
          authResponse = data
          workingEndpoint = endpoint
          break
        } else {
          console.log(`❌ Falhou: ${response.status} - ${response.statusText}`)
        }
      } catch (err) {
        console.log(`❌ Erro no endpoint ${endpoint}:`, err)
        continue
      }
    }

    if (!authSuccess) {
      // Tentar método GET simples
      try {
        console.log("🔍 Tentando método GET simples...")
        const response = await fetch(`${apiUrl}/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-API-Key": secretKey,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("✅ Conexão estabelecida via GET!")
          authSuccess = true
          authResponse = data
          workingEndpoint = `${apiUrl}/status`
        }
      } catch (err) {
        console.log("❌ Método GET também falhou:", err)
      }
    }

    if (authSuccess) {
      return NextResponse.json({
        success: true,
        message: "Autenticação SuperPayBR bem-sucedida",
        endpoint: workingEndpoint,
        response: authResponse,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        details: "Nenhum endpoint de autenticação funcionou",
        testedEndpoints: authEndpoints,
      })
    }
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json({
      success: false,
      error: "Erro interno na autenticação SuperPayBR",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}
