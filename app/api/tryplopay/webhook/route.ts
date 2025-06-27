import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK RECEBIDO ===")

    const body = await request.json()
    console.log("Dados do webhook:", body)

    // Processar notificação conforme documentação TryploPay
    const { fatura, status, event } = body

    if (fatura && status) {
      console.log(`📨 Fatura ${fatura.id} - Status: ${status.title} (${status.code})`)

      // Aqui você pode implementar lógica adicional:
      // - Atualizar banco de dados
      // - Enviar emails
      // - Notificar outros sistemas
      // - etc.

      if (status.code === 5) {
        console.log("🎉 Pagamento confirmado via webhook!")
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook",
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  // Método OPTIONS para validação conforme documentação TryploPay
  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
