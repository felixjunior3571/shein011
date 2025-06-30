import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    if (!externalId) {
      return NextResponse.json({ error: "External ID é obrigatório" }, { status: 400 })
    }

    console.log("🔍 Buscando dados do webhook para:", externalId)

    // Verificar localStorage simulado global
    const localStorageKey = `webhook_payment_${externalId}`
    const globalStorage = global.webhookLocalStorage || new Map()
    const webhookData = globalStorage.get(localStorageKey)

    if (webhookData) {
      const parsedData = JSON.parse(webhookData)
      console.log("✅ Dados encontrados no localStorage simulado:", parsedData)

      return NextResponse.json({
        success: true,
        data: parsedData,
        source: "webhook_localStorage",
        timestamp: new Date().toISOString(),
      })
    }

    console.log("❌ Nenhum dado encontrado para:", externalId)
    return NextResponse.json({
      success: false,
      message: "Nenhum dado de webhook encontrado",
      external_id: externalId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao buscar dados do webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
