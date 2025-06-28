import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")

    const webhookData = await request.json()
    console.log("📥 Dados do webhook SuperPayBR:", JSON.stringify(webhookData, null, 2))

    // Extrair informações do webhook SuperPayBR
    const { fatura, status, payment_id, external_id, amount, paid_at, status_code, status_name } = webhookData

    console.log("🔍 Processando webhook SuperPayBR:", {
      external_id,
      payment_id,
      status_code,
      status_name,
      amount,
      paid_at,
    })

    // Mapear status SuperPayBR para nosso formato
    const mappedStatus = {
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: status_code || status?.code || 0,
      statusName: status_name || status?.title || "Unknown",
      amount: amount || fatura?.valores?.bruto / 100 || 0,
      paymentDate: paid_at || new Date().toISOString(),
    }

    // Status SuperPayBR:
    // 1 = Aguardando Pagamento
    // 2 = Em Análise
    // 3 = Aprovado
    // 4 = Negado
    // 5 = Pago
    // 6 = Cancelado
    // 7 = Vencido
    // 8 = Estornado

    switch (status_code || status?.code) {
      case 5: // Pago
        mappedStatus.isPaid = true
        console.log("✅ PAGAMENTO CONFIRMADO SuperPayBR!")
        break
      case 4: // Negado
        mappedStatus.isDenied = true
        console.log("❌ PAGAMENTO NEGADO SuperPayBR!")
        break
      case 6: // Cancelado
        mappedStatus.isCanceled = true
        console.log("🚫 PAGAMENTO CANCELADO SuperPayBR!")
        break
      case 7: // Vencido
        mappedStatus.isExpired = true
        console.log("⏰ PAGAMENTO VENCIDO SuperPayBR!")
        break
      case 8: // Estornado
        mappedStatus.isRefunded = true
        console.log("↩️ PAGAMENTO ESTORNADO SuperPayBR!")
        break
      default:
        console.log(`ℹ️ Status SuperPayBR: ${status_code} - ${status_name}`)
    }

    // Salvar no localStorage simulado (para webhook monitoring)
    if (external_id) {
      console.log(`💾 Salvando status do pagamento SuperPayBR: ${external_id}`)

      // Simular salvamento no localStorage via resposta
      const webhookResponse = {
        success: true,
        external_id,
        status: mappedStatus,
        raw_webhook: webhookData,
        processed_at: new Date().toISOString(),
      }

      console.log("✅ Webhook SuperPayBR processado com sucesso!")
      return NextResponse.json(webhookResponse)
    } else {
      console.log("⚠️ External ID não encontrado no webhook SuperPayBR")
      return NextResponse.json({
        success: false,
        error: "External ID não encontrado",
        raw_webhook: webhookData,
      })
    }
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no webhook",
      },
      { status: 500 },
    )
  }
}
