import { type NextRequest, NextResponse } from "next/server"

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

    console.log("=== VERIFICANDO PAGAMENTO SUPERPAYBR ===")
    console.log("External ID:", externalId)

    // Redirecionar para o endpoint de status
    const statusResponse = await fetch(
      `${request.nextUrl.origin}/api/superpaybr/payment-status?external_id=${externalId}`,
    )
    const statusResult = await statusResponse.json()

    if (statusResult.success) {
      const isPaid = statusResult.data.status === "paid"
      const isDenied = statusResult.data.status === "denied"
      const isExpired = statusResult.data.status === "expired"

      return NextResponse.json({
        success: true,
        paid: isPaid,
        denied: isDenied,
        expired: isExpired,
        status: statusResult.data.status,
        status_code: statusResult.data.status_code,
        status_title: statusResult.data.status_title,
        amount: statusResult.data.amount,
        payment_date: statusResult.data.payment_date,
        external_id: externalId,
        source: statusResult.source,
      })
    } else {
      return NextResponse.json({
        success: false,
        paid: false,
        denied: false,
        expired: false,
        error: statusResult.error,
      })
    }
  } catch (error) {
    console.log("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        paid: false,
        denied: false,
        expired: false,
        error: "Erro interno ao verificar pagamento",
      },
      { status: 500 },
    )
  }
}
