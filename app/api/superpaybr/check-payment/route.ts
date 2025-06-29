import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Verificando pagamento SuperPayBR:", externalId)

    // Redirecionar para o endpoint de status
    const statusResponse = await fetch(
      `${request.nextUrl.origin}/api/superpaybr/payment-status?external_id=${externalId}`,
    )
    const statusResult = await statusResponse.json()

    if (statusResult.success) {
      const paymentData = statusResult.data

      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          is_paid: paymentData.isPaid,
          is_denied: paymentData.isDenied,
          is_expired: paymentData.isExpired,
          is_canceled: paymentData.isCanceled,
          is_refunded: paymentData.isRefunded,
          status: paymentData.status,
          status_code: paymentData.statusCode,
          status_name: paymentData.statusName,
          amount: paymentData.amount,
          payment_date: paymentData.paymentDate,
          provider: "superpaybr",
        },
        message: "Status do pagamento SuperPayBR obtido com sucesso",
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Pagamento não encontrado",
        external_id: externalId,
      })
    }
  } catch (error) {
    console.log("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao verificar pagamento SuperPayBR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_id } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Verificando pagamento SuperPayBR via POST:", external_id)

    // Redirecionar para o endpoint de status
    const statusResponse = await fetch(
      `${request.nextUrl.origin}/api/superpaybr/payment-status?external_id=${external_id}`,
    )
    const statusResult = await statusResponse.json()

    if (statusResult.success) {
      const paymentData = statusResult.data

      return NextResponse.json({
        success: true,
        data: {
          external_id: external_id,
          is_paid: paymentData.isPaid,
          is_denied: paymentData.isDenied,
          is_expired: paymentData.isExpired,
          is_canceled: paymentData.isCanceled,
          is_refunded: paymentData.isRefunded,
          status: paymentData.status,
          status_code: paymentData.statusCode,
          status_name: paymentData.statusName,
          amount: paymentData.amount,
          payment_date: paymentData.paymentDate,
          provider: "superpaybr",
        },
        message: "Status do pagamento SuperPayBR obtido com sucesso",
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Pagamento não encontrado",
        external_id: external_id,
      })
    }
  } catch (error) {
    console.log("❌ Erro ao verificar pagamento SuperPayBR via POST:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao verificar pagamento SuperPayBR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
