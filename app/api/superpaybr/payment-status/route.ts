import { type NextRequest, NextResponse } from "next/server"

// ⚠️ MESMO ARMAZENAMENTO GLOBAL DO WEBHOOK
const paymentConfirmations = new Map<string, any>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // ✅ BUSCAR POR MÚLTIPLAS CHAVES
    const keys = ["external_id", "externalId", "invoice_id", "invoiceId", "token"]
    let found = null
    let searchKey = null

    for (const key of keys) {
      const value = searchParams.get(key)
      if (value) {
        // Tentar buscar diretamente
        if (paymentConfirmations.has(value)) {
          found = paymentConfirmations.get(value)
          searchKey = value
          break
        }

        // Tentar buscar com prefixo token_
        if (key === "token" && paymentConfirmations.has(`token_${value}`)) {
          found = paymentConfirmations.get(`token_${value}`)
          searchKey = `token_${value}`
          break
        }
      }
    }

    console.log("🔍 Consultando status SuperPayBR:", {
      searchParams: Object.fromEntries(searchParams.entries()),
      found: !!found,
      searchKey,
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
      search_key: searchKey,
      total_confirmations: paymentConfirmations.size,
      timestamp: new Date().toISOString(),
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
