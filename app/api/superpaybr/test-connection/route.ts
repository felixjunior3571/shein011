import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔧 Testando conexão SuperPayBR...")

    // Verificar variáveis de ambiente
    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const webhookUrl = process.env.SUPERPAY_WEBHOOK_URL

    console.log("📋 Configurações:")
    console.log("- API URL:", apiUrl ? "✅ Configurada" : "❌ Não configurada")
    console.log("- Token:", token ? "✅ Configurado" : "❌ Não configurado")
    console.log("- Secret Key:", secretKey ? "✅ Configurada" : "❌ Não configurada")
    console.log("- Webhook URL:", webhookUrl ? "✅ Configurada" : "❌ Não configurada")

    if (!apiUrl || !token || !secretKey) {
      return NextResponse.json({
        success: false,
        error: "Configuração SuperPayBR incompleta",
        details: {
          hasApiUrl: !!apiUrl,
          hasToken: !!token,
          hasSecretKey: !!secretKey,
          hasWebhookUrl: !!webhookUrl,
        },
      })
    }

    // Testar autenticação
    console.log("🔐 Testando autenticação...")

    const authResponse = await fetch("/api/superpaybr/auth")
    const authData = await authResponse.json()

    if (!authData.success) {
      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        details: authData.details,
        step: "authentication",
      })
    }

    console.log("✅ Autenticação bem-sucedida!")

    // Testar criação de fatura
    console.log("🧾 Testando criação de fatura...")

    const testInvoiceData = {
      external_id: `TEST_${Date.now()}`,
      amount: 1.0,
      description: "Teste de conexão SuperPayBR",
      customer: {
        name: "Teste SuperPayBR",
        email: "teste@superpaybr.com",
        document: "00000000000",
        phone: "11999999999",
      },
    }

    const invoiceResponse = await fetch("/api/superpaybr/create-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testInvoiceData),
    })

    const invoiceData = await invoiceResponse.json()

    if (!invoiceData.success) {
      return NextResponse.json({
        success: false,
        error: "Falha na criação de fatura SuperPayBR",
        details: invoiceData.error,
        step: "invoice_creation",
      })
    }

    console.log("✅ Fatura criada com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR funcionando perfeitamente!",
      tests: {
        authentication: "✅ Passou",
        invoice_creation: "✅ Passou",
        mode: invoiceData.mode,
      },
      config: {
        hasApiUrl: !!apiUrl,
        hasToken: !!token,
        hasSecretKey: !!secretKey,
        hasWebhookUrl: !!webhookUrl,
      },
      test_invoice: {
        external_id: invoiceData.external_id,
        amount: invoiceData.amount,
        mode: invoiceData.mode,
      },
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão:", error)

    return NextResponse.json({
      success: false,
      error: "Erro interno no teste de conexão",
      details: error instanceof Error ? error.message : "Erro desconhecido",
      step: "internal_error",
    })
  }
}
