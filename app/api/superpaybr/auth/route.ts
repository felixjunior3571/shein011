import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔐 AUTENTICAÇÃO SUPERPAYBR")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      console.error("❌ Credenciais SuperPayBR não encontradas")
      console.log("Variáveis disponíveis:", {
        SUPERPAYBR_TOKEN: !!process.env.SUPERPAYBR_TOKEN,
        SUPERPAYBR_SECRET_KEY: !!process.env.SUPERPAYBR_SECRET_KEY,
        SUPERPAY_TOKEN: !!process.env.SUPERPAY_TOKEN,
        SUPERPAY_SECRET_KEY: !!process.env.SUPERPAY_SECRET_KEY,
      })

      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          available_vars: {
            SUPERPAYBR_TOKEN: !!process.env.SUPERPAYBR_TOKEN,
            SUPERPAYBR_SECRET_KEY: !!process.env.SUPERPAYBR_SECRET_KEY,
            SUPERPAY_TOKEN: !!process.env.SUPERPAY_TOKEN,
            SUPERPAY_SECRET_KEY: !!process.env.SUPERPAY_SECRET_KEY,
          },
        },
        { status: 500 },
      )
    }

    console.log("🔑 Fazendo autenticação SuperPayBR...")
    console.log("Token preview:", token.substring(0, 10) + "...")
    console.log("Secret preview:", secretKey.substring(0, 20) + "...")

    // Tentar diferentes URLs da API
    const apiUrls = [
      "https://api.superpaybr.com/auth",
      "https://superpaybr.com/api/auth",
      "https://api.superpay.com.br/auth",
    ]

    let lastError = null

    for (const apiUrl of apiUrls) {
      try {
        console.log(`🌐 Tentando URL: ${apiUrl}`)

        const authResponse = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
            scope: "invoice.write, customer.write, webhook.write",
          },
        })

        console.log(`📥 Resposta de ${apiUrl}:`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok,
        })

        if (authResponse.ok) {
          const authData = await authResponse.json()
          console.log("✅ Autenticação SuperPayBR bem-sucedida!")
          console.log("Account:", authData.account)
          console.log("Working:", authData.working)

          return NextResponse.json({
            success: true,
            data: {
              access_token: authData.access_token,
              token_type: authData.token_type,
              expires_in: authData.expires_in,
              account: authData.account,
              working: authData.working,
              scope: authData.scope,
            },
            api_url_used: apiUrl,
          })
        } else {
          const errorText = await authResponse.text()
          lastError = `${apiUrl}: ${authResponse.status} - ${errorText}`
          console.log(`❌ Erro em ${apiUrl}:`, authResponse.status, errorText)
        }
      } catch (err) {
        lastError = `${apiUrl}: ${err instanceof Error ? err.message : "Network error"}`
        console.log(`❌ Erro de rede em ${apiUrl}:`, err)
      }
    }

    // Se chegou aqui, todas as URLs falharam
    console.error("❌ Todas as URLs de autenticação falharam")

    return NextResponse.json(
      {
        success: false,
        error: "Falha na autenticação em todas as URLs testadas",
        last_error: lastError,
        tested_urls: apiUrls,
      },
      { status: 401 },
    )
  } catch (error) {
    console.error("❌ Erro geral na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na autenticação SuperPayBR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
