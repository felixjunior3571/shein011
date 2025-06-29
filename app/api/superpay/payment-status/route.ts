import { type NextRequest, NextResponse } from "next/server"
import { getPaymentConfirmation } from "../webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("🔍 CONSULTA DE STATUS DE PAGAMENTO SUPERPAY:")
    console.log(`- External ID: ${externalId}`)
    console.log(`- Invoice ID: ${invoiceId}`)
    console.log(`- Token: ${token}`)

    if (!externalId && !invoiceId && !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório: externalId, invoiceId ou token",
        },
        { status: 400 },
      )
    }

    // Buscar confirmação por qualquer um dos identificadores
    let confirmation = null
    let searchKey = ""

    if (externalId) {
      confirmation = getPaymentConfirmation(externalId)
      searchKey = externalId
    }

    if (!confirmation && invoiceId) {
      confirmation = getPaymentConfirmation(invoiceId)
      searchKey = invoiceId
    }

    if (!confirmation && token) {
      confirmation = getPaymentConfirmation(`token_${token}`)
      searchKey = `token_${token}`
    }

    console.log(`🔍 Resultado da busca SuperPay para "${searchKey}":`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")

    if (!confirmation) {
      return NextResponse.json({
        success: true,
        found: false,
        message: "Nenhuma confirmação SuperPay encontrada para os parâmetros fornecidos",
        searched_for: { externalId, invoiceId, token },
        note: "Aguardando notificação da adquirente via webhook SuperPay",
        timestamp: new Date().toISOString(),
      })
    }

    console.log("✅ CONFIRMAÇÃO SUPERPAY ENCONTRADA:")
    console.log(JSON.stringify(confirmation, null, 2))

    return NextResponse.json({
      success: true,
      found: true,
      message: "Confirmação SuperPay encontrada no sistema",
      data: {
        externalId: confirmation.externalId,
        invoiceId: confirmation.invoiceId,
        status: confirmation.status,
        statusCode: confirmation.statusCode,
        statusName: confirmation.statusName,
        amount: confirmation.amount,
        paymentDate: confirmation.paymentDate,
        payId: confirmation.payId,
        gateway: confirmation.gateway,
        type: confirmation.type,
        token: confirmation.token,
        isPaid: confirmation.isPaid,
        isRefunded: confirmation.isRefunded,
        isDenied: confirmation.isDenied,
        isExpired: confirmation.isExpired,
        isCanceled: confirmation.isCanceled,
        processed: confirmation.processed,
        timestamp: confirmation.timestamp,
      },
      searched_with: searchKey,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao consultar status SuperPay:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
