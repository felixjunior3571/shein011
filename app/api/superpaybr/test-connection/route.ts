import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== TESTE DE CONEXÃO SUPERPAYBR ===")

    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    if (!token || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            token: !token,
            secretKey: !secretKey,
          },
        },
        { status: 500 },
      )
    }

    console.log("🔑 Testando autenticação SuperPayBR...")

    // Teste 1: Autenticação
    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    const authResult = {
      status: authResponse.status,
      ok: authResponse.ok,
      statusText: authResponse.statusText,
    }

    let authData = null
    if (authResponse.ok) {
      authData = await authResponse.json()
      console.log("✅ Autenticação SuperPayBR bem-sucedida!")
    } else {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação SuperPayBR:", errorText)
    }

    // Teste 2: Verificar status do token (se autenticação funcionou)
    let statusResult = null
    if (authData?.access_token) {
      console.log("🔍 Testando status do token...")

      const statusResponse = await fetch("https://api.superpaybr.com/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.access_token}`,
        },
      })

      statusResult = {
        status: statusResponse.status,
        ok: statusResponse.ok,
        statusText: statusResponse.statusText,
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        statusResult.data = statusData
        console.log("✅ Status do token verificado!")
      } else {
        const errorText = await statusResponse.text()
        console.log("❌ Erro ao verificar status:", errorText)
        statusResult.error = errorText
      }
    }

    // Teste 3: URLs disponíveis
    const availableUrls = {
      auth: "https://api.superpaybr.com/auth",
      status: "https://api.superpaybr.com/status",
      createInvoice: "https://api.superpaybr.com/v4/invoices",
      listInvoices: "https://api.superpaybr.com/invoices",
      qrcode: "https://api.superpaybr.com/invoices/qrcode/:id",
      webhooks: "https://api.superpaybr.com/webhooks",
      customers: "https://api.superpaybr.com/costumers",
    }

    return NextResponse.json({
      success: authResponse.ok,
      timestamp: new Date().toISOString(),
      credentials: {
        token_configured: !!token,
        secret_configured: !!secretKey,
        token_preview: token ? `${token.substring(0, 8)}...` : null,
        secret_preview: secretKey ? `${secretKey.substring(0, 20)}...` : null,
      },
      tests: {
        auth: {
          ...authResult,
          data: authData
            ? {
                account: authData.account,
                working: authData.working,
                expires_in: authData.expires_in,
                scope: authData.scope,
              }
            : null,
        },
        status: statusResult,
      },
      urls: availableUrls,
      notes: [
        "✅ POST /v4/invoices - Para criar faturas",
        "✅ GET /auth - Para autenticação",
        "✅ GET /status - Para verificar token",
        "✅ GET /invoices/qrcode/:id - Para obter QR Code",
        "⚠️ Não usar GET em /v4/invoices (não suportado)",
      ],
    })
  } catch (error) {
    console.log("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
