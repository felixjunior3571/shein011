import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔐 [SuperPayBR Auth] Iniciando autenticação...")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAYBR_TOKEN
    const secretKey = process.env.SUPERPAYBR_SECRET_KEY

    console.log("🔧 [SuperPayBR Auth] Verificando credenciais:", {
      token: token ? "✅ Configurado" : "❌ Não configurado",
      secretKey: secretKey ? "✅ Configurado" : "❌ Não configurado",
    })

    if (!token || !secretKey) {
      console.log("❌ [SuperPayBR Auth] Credenciais não configuradas")
      return NextResponse.json({
        success: false,
        error: "Credenciais SuperPayBR não configuradas",
        fallback: true,
      })
    }

    // Fazer requisição para SuperPayBR
    const authUrl = "https://api.superpaybr.com/auth"

    console.log("📤 [SuperPayBR Auth] Fazendo requisição para:", authUrl)

    const response = await fetch(authUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    console.log("📥 [SuperPayBR Auth] Resposta recebida:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (response.ok) {
      const data = await response.json()

      console.log("✅ [SuperPayBR Auth] Autenticação bem-sucedida!")
      console.log("📋 [SuperPayBR Auth] Dados:", {
        account: data.account,
        working: data.working,
        expires_in: data.expires_in,
        hasToken: !!data.access_token,
      })

      return NextResponse.json({
        success: true,
        data: {
          access_token: data.access_token,
          account: data.account,
          working: data.working,
          expires_in: data.expires_in,
          token_type: data.token_type,
          scope: data.scope,
          companie: data.companie,
          details: data.details,
        },
        fallback: false,
      })
    } else {
      const errorText = await response.text()
      console.log("❌ [SuperPayBR Auth] Erro na autenticação:", {
        status: response.status,
        error: errorText,
      })

      return NextResponse.json({
        success: false,
        error: `Erro na autenticação SuperPayBR: ${response.status}`,
        fallback: true,
      })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Auth] Erro geral:", error)

    return NextResponse.json({
      success: false,
      error: "Erro interno na autenticação",
      fallback: true,
    })
  }
}
