import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pixPayload = searchParams.get("payload")

    if (!pixPayload) {
      return NextResponse.json(
        {
          success: false,
          error: "PIX payload é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Gerando QR Code para PIX payload:", pixPayload.substring(0, 50) + "...")

    // Gerar QR Code usando QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    console.log("✅ QR Code gerado:", qrCodeUrl)

    return NextResponse.json({
      success: true,
      qr_code: qrCodeUrl,
      payload: pixPayload,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar QR Code",
      },
      { status: 500 },
    )
  }
}
