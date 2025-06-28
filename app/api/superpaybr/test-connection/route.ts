import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔧 [SuperPayBR Test] Testando conexão...")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    console.log("🔍 [SuperPayBR Test] Verificando credenciais:", {
      token: token ? "✅ Configurado" : "❌ Não configurado",
      secretKey: secretKey ? "✅ Configurado" : "❌ Não configurado",
    })

    if (!token || !secretKey) {
      return NextResponse.json({
        success: false,
        error: "Credenciais SuperPayBR não configuradas",
        details: {
          token: !!token,
          secretKey: !!secretKey,
        },
      })
    }

    // Testar autenticação
    console.log("🔐 [SuperPayBR Test] Testando autenticação...")

    const authResponse = await fetch("https://api.superpaybr.com/auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    console.log("📥 [SuperPayBR Test] Resposta da autenticação:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()

      console.log("✅ [SuperPayBR Test] Autenticação bem-sucedida!")
      console.log("📋 [SuperPayBR Test] Dados da conta:", {
        account: authData.account,
        working: authData.working,
        companie: authData.companie,
        expires_in: authData.expires_in,
        scope: authData.scope,
      })

      // Testar status do token
      console.log("🔍 [SuperPayBR Test] Testando status do token...")

      const statusResponse = await fetch("https://api.superpaybr.com/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.access_token}`,
        },
      })

      let statusData = null
      if (statusResponse.ok) {
        statusData = await statusResponse.json()
        console.log("✅ [SuperPayBR Test] Status do token:", statusData)
      } else {
        console.log("⚠️ [SuperPayBR Test] Erro ao verificar status do token:", statusResponse.status)
      }

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR estabelecida com sucesso",
        auth: {
          account: authData.account,
          working: authData.working,
          companie: authData.companie,
          expires_in: authData.expires_in,
          scope: authData.scope,
          details: authData.details,
        },
        tokenStatus: statusData,
        endpoints: {
          auth: "https://api.superpaybr.com/auth",
          invoices: "https://api.superpaybr.com/v4/invoices",
          status: "https://api.superpaybr.com/status",
          webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        },
      })
    } else {
      const errorText = await authResponse.text()
      console.log("❌ [SuperPayBR Test] Erro na autenticação:", {
        status: authResponse.status,
        error: errorText,
      })

      return NextResponse.json({
        success: false,
        error: `Erro na autenticação SuperPayBR: ${authResponse.status}`,
        details: errorText,
        credentials: {
          token: !!token,
          secretKey: !!secretKey,
        },
      })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Test] Erro geral:", error)

    return NextResponse.json({
      success: false,
      error: "Erro interno no teste de conexão",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
