import { type NextRequest, NextResponse } from "next/server"

// ⚠️ MESMO ARMAZENAMENTO GLOBAL DO WEBHOOK
const paymentConfirmations = new Map<string, any>()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // ✅ BUSCAR POR MÚLTIPLAS CHAVES
    const keys = ["externalId", "invoiceId", "token"]
    let found = null

    for (const key of keys) {
      const value = searchParams.get(key)
      if (value && paymentConfirmations.has(value)) {
        found = paymentConfirmations.get(value)
        break
      }
    }

    console.log("🔍 Consultando status SuperPayBR:", {
      searchParams: Object.fromEntries(searchParams.entries()),
      found: !!found,
      confirmations_total: paymentConfirmations.size,
    })

    if (found) {
      console.log("✅ Confirmação encontrada em memória:", {
        externalId: found.externalId,
        isPaid: found.isPaid,
        statusCode: found.statusCode,
        statusName: found.statusName,
      })
    }

    return NextResponse.json({
      success: true,
      found: !!found,
      data: found || null,
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao consultar status SuperPayBR",
      },
      { status: 500 },
    )
  }
}
