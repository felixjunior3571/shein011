import { type NextRequest, NextResponse } from "next/server"
import { globalPaymentStorage } from "../webhook/route"

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

    console.log(`⚡ Verificação rápida SuperPayBR: ${externalId}`)

    // Consultar apenas o armazenamento global (sem rate limit)
    const cachedData = globalPaymentStorage.get(externalId)

    if (cachedData) {
      console.log("✅ Pagamento encontrado no cache")
      return NextResponse.json({
        success: true,
        found: true,
        is_paid: cachedData.is_paid,
        status: cachedData.status.text,
        amount: cachedData.amount,
        payment_date: cachedData.payment_date,
      })
    }

    console.log("⚠️ Pagamento não encontrado no cache")

    return NextResponse.json({
      success: true,
      found: false,
      is_paid: false,
      status: "pending",
      amount: 0,
      payment_date: null,
    })
  } catch (error) {
    console.error("❌ Erro na verificação rápida SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro na verificação",
      },
      { status: 500 },
    )
  }
}
