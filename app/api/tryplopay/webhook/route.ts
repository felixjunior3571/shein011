import { type NextRequest, NextResponse } from "next/server"

// Webhook para receber notificações da TryploPay
export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK TRYPLOPAY RECEBIDO ===")

    const body = await request.json()
    console.log("Webhook payload:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook conforme documentação TryploPay
    const { fatura, invoice, event, status, payment_status } = body

    const invoiceData = fatura || invoice

    if (!invoiceData) {
      console.log("❌ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ received: false, error: "Invoice data not found" }, { status: 400 })
    }

    console.log("Invoice ID:", invoiceData.id)
    console.log("Status Code:", invoiceData.status?.code)
    console.log("Status Title:", invoiceData.status?.title)
    console.log("Event:", event)

    // Processar diferentes tipos de eventos
    switch (invoiceData.status?.code) {
      case 1:
        console.log("📋 Status: Aguardando Pagamento")
        break
      case 2:
        console.log("⏳ Status: Em Processamento")
        break
      case 5:
        console.log("✅ Status: PAGO!")
        // Aqui você pode implementar lógica para processar o pagamento confirmado
        // Por exemplo: atualizar banco de dados, enviar email, etc.
        break
      case 6:
        console.log("❌ Status: Cancelado")
        break
      case 9:
        console.log("🔄 Status: Estornado")
        break
      case 15:
        console.log("⏰ Status: Vencido")
        break
      default:
        console.log(`ℹ️ Status: ${invoiceData.status?.title} (${invoiceData.status?.code})`)
    }

    // Salvar webhook no localStorage do servidor (simulação)
    // Em produção, você salvaria em um banco de dados
    console.log("Webhook processado com sucesso")

    return NextResponse.json({
      received: true,
      invoice_id: invoiceData.id,
      status: invoiceData.status?.code,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error)

    return NextResponse.json(
      {
        received: false,
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// Método OPTIONS para validação conforme documentação TryploPay
export async function OPTIONS(request: NextRequest) {
  console.log("=== WEBHOOK OPTIONS VALIDATION ===")

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
