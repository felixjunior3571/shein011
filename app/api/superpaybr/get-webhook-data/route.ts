import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    console.log("🔍 [SuperPayBR Webhook Data] Buscando dados do webhook:")
    console.log("- External ID:", externalId)

    if (!externalId) {
      console.log("❌ [SuperPayBR Webhook Data] External ID não fornecido")
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    // Verificar localStorage simulado global
    const localStorageKey = `webhook_payment_${externalId}`

    try {
      // Verificar se existe localStorage simulado global
      if (typeof global !== "undefined" && global.webhookLocalStorage) {
        const webhookData = global.webhookLocalStorage.get(localStorageKey)

        if (webhookData) {
          const parsedData = JSON.parse(webhookData)
          console.log("✅ [SuperPayBR Webhook Data] Dados encontrados:", parsedData)

          return NextResponse.json({
            success: true,
            data: parsedData,
            source: "webhook_localStorage",
            timestamp: new Date().toISOString(),
          })
        }
      }

      console.log("⚠️ [SuperPayBR Webhook Data] Nenhum dado encontrado no localStorage simulado")

      return NextResponse.json({
        success: false,
        error: "Nenhum dado de webhook encontrado",
        message: `Nenhum webhook processado para External ID: ${externalId}`,
        source: "webhook_not_found",
        timestamp: new Date().toISOString(),
      })
    } catch (storageError) {
      console.log("❌ [SuperPayBR Webhook Data] Erro ao acessar localStorage:", storageError)

      return NextResponse.json({
        success: false,
        error: "Erro ao acessar dados do webhook",
        message: storageError instanceof Error ? storageError.message : "Erro desconhecido",
        source: "storage_error",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Webhook Data] Erro geral:", error)

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
