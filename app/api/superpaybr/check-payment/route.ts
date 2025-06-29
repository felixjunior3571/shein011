import { type NextRequest, NextResponse } from "next/server"
import { paymentConfirmations } from "../webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Verificando pagamento SuperPayBR: ${externalId}`)

    // Consultar memória global primeiro (sem rate limit)
    const paymentData = paymentConfirmations.get(externalId)

    if (paymentData) {
      console.log(`✅ Pagamento encontrado em memória: ${paymentData.statusName}`)

      return NextResponse.json({
        success: true,
        isPaid: paymentData.isPaid,
        isDenied: paymentData.isDenied,
        isRefunded: paymentData.isRefunded,
        isExpired: paymentData.isExpired,
        isCanceled: paymentData.isCanceled,
        statusCode: paymentData.statusCode,
        statusName: paymentData.statusName,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
        timestamp: paymentData.timestamp,
        source: "webhook_memory",
      })
    }

    console.log(`ℹ️ Pagamento não encontrado em memória: ${externalId}`)

    // Se não encontrado em memória, consultar API SuperPayBR
    try {
      console.log("🌐 Consultando API SuperPayBR...")

      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
        method: "POST",
      })

      if (!authResponse.ok) {
        throw new Error("Falha na autenticação SuperPayBR")
      }

      const authData = await authResponse.json()
      const accessToken = authData.access_token

      const apiUrl = process.env.SUPERPAY_API_URL
      const checkResponse = await fetch(`${apiUrl}/v4/invoices/${externalId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })

      if (checkResponse.ok) {
        const invoiceData = await checkResponse.json()
        const statusCode = invoiceData.status?.code || 1

        const isPaid = statusCode === 5
        const isDenied = [7, 10, 11, 12, 16].includes(statusCode)
        const isExpired = [9, 14, 15].includes(statusCode)
        const isCanceled = statusCode === 6
        const isRefunded = statusCode === 8

        console.log(`📊 Status da API SuperPayBR: ${statusCode}`)

        return NextResponse.json({
          success: true,
          isPaid,
          isDenied,
          isRefunded,
          isExpired,
          isCanceled,
          statusCode,
          statusName: invoiceData.status?.title || "Status Desconhecido",
          amount: (invoiceData.valores?.bruto || 0) / 100,
          paymentDate: isPaid ? new Date().toISOString() : null,
          timestamp: new Date().toISOString(),
          source: "api_direct",
        })
      }
    } catch (apiError) {
      console.log("⚠️ Erro ao consultar API SuperPayBR:", apiError)
    }

    // Retornar status padrão se não encontrado
    return NextResponse.json({
      success: true,
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 1,
      statusName: "Aguardando Pagamento",
      amount: 0,
      paymentDate: null,
      timestamp: new Date().toISOString(),
      source: "default",
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Use GET para verificar pagamento",
    timestamp: new Date().toISOString(),
  })
}
