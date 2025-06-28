import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTE DE CONEXÃO SUPERPAYBR ===")

    const results = {
      auth: null,
      status: null,
      qrcode_test: null,
      credentials: {
        token: process.env.SUPERPAYBR_TOKEN ? "✅ Configurado" : "❌ Não configurado",
        secret: process.env.SUPERPAYBR_SECRET_KEY ? "✅ Configurado" : "❌ Não configurado",
      },
      endpoints: {
        auth: "https://api.superpaybr.com/auth",
        invoices: "https://api.superpaybr.com/v4/invoices",
        qrcode: "https://api.superpaybr.com/invoices/qrcode/{ID}",
        status: "https://api.superpaybr.com/status",
      },
    }

    // Teste 1: Autenticação
    try {
      console.log("🔑 Testando autenticação...")
      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
      const authResult = await authResponse.json()

      results.auth = {
        success: authResult.success,
        status: authResponse.status,
        account: authResult.data?.account,
        working: authResult.data?.working,
        expires: authResult.data?.expires_in ? new Date(authResult.data.expires_in * 1000).toLocaleString() : null,
        error: authResult.error,
      }

      console.log("✅ Teste de autenticação concluído")

      // Teste 2: Status do token (se autenticação funcionou)
      if (authResult.success) {
        console.log("📊 Testando status do token...")
        const accessToken = authResult.data.access_token

        const statusResponse = await fetch("https://api.superpaybr.com/status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        const statusResult = await statusResponse.json()
        results.status = {
          success: statusResponse.ok,
          status: statusResponse.status,
          token_status: statusResult.status,
          expires: statusResult.expires_in ? new Date(statusResult.expires_in * 1000).toLocaleString() : null,
          error: statusResponse.ok ? null : statusResult,
        }

        console.log("✅ Teste de status concluído")
      }

      // Teste 3: QR Code endpoint (teste público)
      console.log("🔗 Testando endpoint de QR Code...")
      const qrcodeResponse = await fetch("https://api.superpaybr.com/invoices/qrcode/TEST_ID", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const qrcodeText = await qrcodeResponse.text()
      results.qrcode_test = {
        success: qrcodeResponse.ok,
        status: qrcodeResponse.status,
        response: qrcodeText.substring(0, 200) + (qrcodeText.length > 200 ? "..." : ""),
        note: "Esperado 404 para ID de teste",
      }

      console.log("✅ Teste de QR Code concluído")
    } catch (error) {
      console.log("❌ Erro nos testes:", error)
      results.auth = {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }

    return NextResponse.json({
      success: true,
      message: "Teste de conexão SuperPayBR concluído",
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.log("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão",
      },
      { status: 500 },
    )
  }
}
