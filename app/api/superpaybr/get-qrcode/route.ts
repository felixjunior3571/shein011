import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔲 === GERANDO QR CODE SUPERPAYBR ===")

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

    console.log("📱 Gerando QR Code para PIX payload:", pixPayload.substring(0, 50) + "...")

    // Gerar QR Code via QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    // Alternativas de QR Code
    const alternatives = [
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`,
      `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(pixPayload)}`,
    ]

    return NextResponse.json({
      success: true,
      data: {
        pix_payload: pixPayload,
        qr_code_url: qrCodeUrl,
        alternatives: alternatives,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao gerar QR Code",
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
        error: "PIX payload é obrigatório via query parameter 'payload'",
      },
      { status: 400 },
    )
  }

  return POST(
    new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify({ pix_payload: pixPayload }),
      headers: { "Content-Type": "application/json" },
    }),
  )
}
