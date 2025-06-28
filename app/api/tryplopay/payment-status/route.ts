import { type NextRequest, NextResponse } from "next/server"
import { getPaymentConfirmation, getAllConfirmations, getRealtimeEvents } from "@/lib/payment-storage"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")
    const action = searchParams.get("action") // Para debug: "all" ou "events"

    console.log("🔍 CONSULTA DE STATUS RECEBIDA:")
    console.log(`- External ID: ${externalId}`)
    console.log(`- Invoice ID: ${invoiceId}`)
    console.log(`- Token: ${token}`)
    console.log(`- Action: ${action}`)

    // Ações especiais para debug
    if (action === "all") {
      const allConfirmations = getAllConfirmations()
      console.log(`📊 Retornando ${allConfirmations.length} confirmações`)
      return NextResponse.json({
        success: true,
        action: "all_confirmations",
        total: allConfirmations.length,
        data: allConfirmations,
      })
    }

    if (action === "events") {
      const events = getRealtimeEvents()
      console.log(`📊 Retornando ${events.length} eventos em tempo real`)
      return NextResponse.json({
        success: true,
        action: "realtime_events",
        total: events.length,
        data: events,
      })
    }

    // Busca principal
    const identifier = externalId || invoiceId || token

    if (!identifier) {
      console.log("❌ Nenhum identificador fornecido")
      return NextResponse.json(
        {
          success: false,
          error: "É necessário fornecer externalId, invoiceId ou token",
        },
        { status: 400 },
      )
    }

    console.log(`🔎 Buscando confirmação para: ${identifier}`)

    // Buscar em múltiplas chaves
    const confirmation = getPaymentConfirmation(identifier)

    if (!confirmation) {
      console.log(`❌ Confirmação não encontrada para: ${identifier}`)
      return NextResponse.json({
        success: true,
        found: false,
        searched_for: identifier,
        message: "Nenhuma confirmação encontrada",
      })
    }

    console.log("✅ Confirmação encontrada:")
    console.log(`- External ID: ${confirmation.externalId}`)
    console.log(`- Invoice ID: ${confirmation.invoiceId}`)
    console.log(`- Status: ${confirmation.statusName} (${confirmation.statusCode})`)
    console.log(`- isPaid: ${confirmation.isPaid}`)
    console.log(`- isRefunded: ${confirmation.isRefunded}`)
    console.log(`- isDenied: ${confirmation.isDenied}`)
    console.log(`- isExpired: ${confirmation.isExpired}`)
    console.log(`- isCanceled: ${confirmation.isCanceled}`)
    console.log(`- Valor: R$ ${confirmation.amount.toFixed(2)}`)
    console.log(`- Recebido em: ${confirmation.receivedAt}`)

    // Resposta estruturada
    const response = {
      success: true,
      found: true,
      searched_for: identifier,
      data: {
        externalId: confirmation.externalId,
        invoiceId: confirmation.invoiceId,
        token: confirmation.token,
        isPaid: confirmation.isPaid,
        isRefunded: confirmation.isRefunded,
        isDenied: confirmation.isDenied,
        isExpired: confirmation.isExpired,
        isCanceled: confirmation.isCanceled,
        amount: confirmation.amount,
        paymentDate: confirmation.paymentDate,
        statusCode: confirmation.statusCode,
        statusName: confirmation.statusName,
        statusDescription: confirmation.statusDescription,
        receivedAt: confirmation.receivedAt,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.log("❌ Erro na consulta de status:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
