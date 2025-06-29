import { type NextRequest, NextResponse } from "next/server"

// Importar armazenamento global do webhook
const paymentConfirmations = new Map<string, any>()
const realtimeEvents: any[] = []

function getPaymentConfirmation(identifier: string) {
  // Buscar por external_id
  let confirmation = paymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por invoice_id
  confirmation = paymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por token
  confirmation = paymentConfirmations.get(`token_${identifier}`)
  if (confirmation) return confirmation

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")
    const action = searchParams.get("action")

    console.log("🔍 Verificando status de pagamento SuperPayBR:", { externalId, invoiceId, token, action })

    if (action === "all") {
      // Retornar todas as confirmações
      const confirmations: any[] = []
      const seen = new Set<string>()

      for (const [key, value] of paymentConfirmations.entries()) {
        if (!seen.has(value.externalId)) {
          confirmations.push(value)
          seen.add(value.externalId)
        }
      }

      return NextResponse.json({
        success: true,
        data: confirmations.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
      })
    }

    if (action === "events") {
      // Retornar eventos recentes
      return NextResponse.json({
        success: true,
        data: [...realtimeEvents],
      })
    }

    // Determinar identificador para busca
    const identifier = externalId || invoiceId || token
    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID, Invoice ID ou Token obrigatório",
        },
        { status: 400 },
      )
    }

    // Buscar confirmação por múltiplas chaves
    let confirmation = null

    if (externalId) {
      confirmation = getPaymentConfirmation(externalId)
      console.log(`🔍 Busca por External ID (${externalId}):`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")
    }

    if (!confirmation && invoiceId) {
      confirmation = getPaymentConfirmation(invoiceId)
      console.log(`🔍 Busca por Invoice ID (${invoiceId}):`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")
    }

    if (!confirmation && token) {
      confirmation = getPaymentConfirmation(`token_${token}`)
      console.log(`🔍 Busca por Token (${token}):`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")
    }

    if (!confirmation) {
      console.log("⏳ Nenhuma confirmação encontrada para:", identifier)
      return NextResponse.json({
        success: true,
        found: false,
        message: "No webhook data found yet",
      })
    }

    console.log("✅ Confirmação encontrada:", {
      externalId: confirmation.externalId,
      isPaid: confirmation.isPaid,
      isDenied: confirmation.isDenied,
      isExpired: confirmation.isExpired,
      isCanceled: confirmation.isCanceled,
      isRefunded: confirmation.isRefunded,
    })

    // Resposta estruturada
    return NextResponse.json({
      success: true,
      found: true,
      data: {
        externalId: confirmation.externalId,
        invoiceId: confirmation.invoiceId,
        token: confirmation.token,
        isPaid: confirmation.isPaid,
        isDenied: confirmation.isDenied,
        isRefunded: confirmation.isRefunded,
        isExpired: confirmation.isExpired,
        isCanceled: confirmation.isCanceled,
        amount: confirmation.amount,
        paymentDate: confirmation.paymentDate,
        statusCode: confirmation.statusCode,
        statusName: confirmation.statusName,
        pixCode: confirmation.pixCode,
        qrCodeUrl: confirmation.qrCodeUrl,
        receivedAt: confirmation.receivedAt,
      },
    })
  } catch (error) {
    console.error("❌ Erro na verificação de status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
