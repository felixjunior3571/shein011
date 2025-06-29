import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔳 === GERANDO QR CODE SUPERPAYBR ===")

    const body = await request.json()
    const pixPayload = body.pix_payload || body.payload

    if (!pixPayload) {
      return NextResponse.json(
        {
          success: false,
          error: "PIX payload é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📱 Gerando QR Code para payload:", pixPayload.slice(0, 20) + "...")

    // Gerar QR Code usando QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    console.log("✅ QR Code gerado:", qrCodeUrl)

    return NextResponse.json({
      success: true,
      data: {
        qr_code_url: qrCodeUrl,
        pix_payload: pixPayload,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao gerar QR Code",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pixPayload = searchParams.get("payload")

  if (!pixPayload) {
    return NextResponse.json(
      {
        success: false,
        error: "PIX payload é obrigatório como parâmetro 'payload'",
      },
      { status: 400 },
    )
  }

  try {
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    return NextResponse.json({
      success: true,
      data: {
        qr_code_url: qrCodeUrl,
        pix_payload: pixPayload,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao gerar QR Code",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
