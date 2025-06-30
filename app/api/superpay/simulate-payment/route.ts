import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Simulando pagamento SuperPay...")

    const body = await request.json()
    const { externalId, statusCode, amount } = body

    if (!externalId || !statusCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios ausentes",
          message: "externalId e statusCode são obrigatórios",
        },
        { status: 400 },
      )
    }

    // Simular webhook SuperPay
    const webhookData = {
      event: {
        type: "payment_status_changed",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `INV_${Date.now()}`,
        external_id: externalId,
        amount: amount || 29.9,
        status: {
          code: statusCode,
          title: getStatusName(statusCode),
        },
        payment:
          statusCode === 5
            ? {
                payDate: new Date().toISOString(),
              }
            : undefined,
      },
    }

    // Enviar para o próprio webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/superpay/webhook`

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      })

      const webhookResult = await webhookResponse.json()

      console.log("✅ Webhook simulado enviado:", webhookResult)

      return NextResponse.json({
        success: true,
        message: "Pagamento simulado com sucesso",
        data: {
          external_id: externalId,
          status_code: statusCode,
          status_name: getStatusName(statusCode),
          amount: amount || 29.9,
          webhook_sent: webhookResult.success,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (webhookError) {
      console.error("❌ Erro ao enviar webhook simulado:", webhookError)

      return NextResponse.json({
        success: true,
        message: "Pagamento simulado (webhook falhou)",
        data: {
          external_id: externalId,
          status_code: statusCode,
          status_name: getStatusName(statusCode),
          amount: amount || 29.9,
          webhook_sent: false,
          webhook_error: webhookError instanceof Error ? webhookError.message : "Erro desconhecido",
        },
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}

function getStatusName(statusCode: number): string {
  const statusMap: { [key: number]: string } = {
    1: "Aguardando Pagamento",
    2: "Em Processamento",
    3: "Processando",
    4: "Aprovado",
    5: "Pago",
    6: "Cancelado",
    7: "Contestado",
    8: "Chargeback",
    9: "Estornado",
    10: "Falha",
    11: "Bloqueado",
    12: "Negado",
    13: "Análise",
    14: "Análise Manual",
    15: "Vencido",
  }

  return statusMap[statusCode] || "Status Desconhecido"
}
