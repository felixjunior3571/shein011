import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🏗️ Criando fatura SuperPayBR...")

    const body = await request.json()
    const { amount, description, externalId, customerName, customerEmail, customerDocument } = body

    if (!amount || !externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount e externalId são obrigatórios",
        },
        { status: 400 },
      )
    }

    // ⚠️ TIMEOUT para evitar requisições travadas
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos

    // 1. Autenticar
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      signal: controller.signal,
    })
    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error(`Erro na autenticação: ${authData.error}`)
    }

    // 2. Criar fatura
    const invoiceData = {
      external_id: externalId,
      amount: Math.round(amount * 100), // Converter para centavos
      description: description || "Pagamento via PIX",
      payment_method: "pix",
      customer: {
        name: customerName || "Cliente",
        email: customerEmail || "cliente@exemplo.com",
        document: customerDocument || "00000000000",
      },
      webhook_url: process.env.SUPERPAYBR_WEBHOOK_URL,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    }

    console.log("📤 Enviando dados para SuperPayBR:", invoiceData)

    const createResponse = await fetch(`${process.env.SUPERPAYBR_API_URL}/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
      body: JSON.stringify(invoiceData),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const createResponseText = await createResponse.text()
    console.log("📥 Resposta SuperPayBR Create:", createResponseText.substring(0, 500))

    if (!createResponse.ok) {
      throw new Error(`HTTP ${createResponse.status}: ${createResponse.statusText}`)
    }

    let createResult
    try {
      createResult = JSON.parse(createResponseText)
    } catch (parseError) {
      throw new Error(`Erro ao parsear JSON: ${createResponseText}`)
    }

    if (createResult.success && createResult.data) {
      const invoice = createResult.data
      const pixCode = invoice.payment?.details?.pix_code || "PIX_EMERGENCIA_123456789"
      const qrCodeUrl =
        invoice.payment?.details?.qrcode || `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=300`

      console.log("✅ Fatura SuperPayBR criada com sucesso!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`🔑 External ID: ${externalId}`)
      console.log(`📄 Invoice ID: ${invoice.id}`)

      return NextResponse.json({
        success: true,
        data: {
          invoice_id: invoice.id,
          external_id: externalId,
          amount: amount,
          pix_code: pixCode,
          qr_code_url: qrCodeUrl,
          payment_url: invoice.payment?.details?.url || "",
          expires_at: invoice.expires_at,
          status: invoice.status?.title || "Aguardando Pagamento",
        },
      })
    } else {
      throw new Error(createResult.message || "Erro ao criar fatura SuperPayBR")
    }
  } catch (error) {
    console.error("❌ Erro ao criar fatura SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar fatura SuperPayBR",
      },
      { status: 500 },
    )
  }
}
