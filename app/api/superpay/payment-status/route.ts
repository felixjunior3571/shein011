import { type NextRequest, NextResponse } from "next/server"

// Referência ao Map global do webhook
declare global {
  var paymentConfirmations: Map<string, any> | undefined
  var realtimeEvents: any[] | undefined
}

// Inicializar se não existir
if (!global.paymentConfirmations) {
  global.paymentConfirmations = new Map()
}
if (!global.realtimeEvents) {
  global.realtimeEvents = []
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const keys = ["externalId", "external_id", "invoiceId", "invoice_id", "token"]
    let found = null
    let searchKey = ""

    // ✅ BUSCAR POR MÚLTIPLAS CHAVES
    for (const key of keys) {
      const value = searchParams.get(key)
      if (value && global.paymentConfirmations.has(value)) {
        found = global.paymentConfirmations.get(value)
        searchKey = `${key}=${value}`
        break
      }
      // Tentar também com prefixo token_
      if (key === "token" && value && global.paymentConfirmations.has(`token_${value}`)) {
        found = global.paymentConfirmations.get(`token_${value}`)
        searchKey = `token_${value}`
        break
      }
    }

    console.log(`🔍 Consulta payment-status: ${searchKey}`)
    console.log(`📊 Total confirmações: ${global.paymentConfirmations.size}`)
    console.log(`📋 Resultado: ${found ? "ENCONTRADO" : "NÃO ENCONTRADO"}`)

    if (found) {
      console.log(`✅ Confirmação encontrada:`, {
        externalId: found.externalId,
        statusCode: found.statusCode,
        statusName: found.statusName,
        isPaid: found.isPaid,
      })
    }

    return NextResponse.json({
      success: true,
      found: !!found,
      data: found || null,
      search_key: searchKey,
      total_confirmations: global.paymentConfirmations.size,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao consultar payment-status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        found: false,
        data: null,
      },
      { status: 500 },
    )
  }
}
