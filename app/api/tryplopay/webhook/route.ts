import { type NextRequest, NextResponse } from "next/server"

// Método OPTIONS para validação do webhook
export async function OPTIONS(request: NextRequest) {
  console.log("=== WEBHOOK VALIDATION ===")

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

// Método POST para receber notificações
export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK RECEBIDO ===")

    const body = await request.json()
    console.log("📨 Dados do webhook:", JSON.stringify(body, null, 2))

    // Processar diferentes tipos de notificação
    const { type, data } = body

    switch (type) {
      case "invoice.paid":
        console.log("✅ Pagamento confirmado:", data.invoice_id)
        // Aqui você pode atualizar o banco de dados, enviar emails, etc.
        break

      case "invoice.canceled":
        console.log("❌ Pagamento cancelado:", data.invoice_id)
        break

      case "invoice.expired":
        console.log("⏰ Pagamento expirado:", data.invoice_id)
        break

      default:
        console.log("📋 Tipo de notificação:", type)
    }

    // Sempre retornar 200 para confirmar recebimento
    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook:", error)

    // Mesmo com erro, retornar 200 para evitar reenvios
    return NextResponse.json({
      success: false,
      error: "Erro interno",
      message: "Webhook recebido mas com erro no processamento",
    })
  }
}
