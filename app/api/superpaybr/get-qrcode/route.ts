import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payload = searchParams.get("payload")

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro 'payload' é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔲 === GERANDO QR CODE ===")
    console.log("📋 Payload PIX:", payload.slice(0, 50) + "...")

    // Gerar QR Code usando QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=300&format=png&margin=1`

    return NextResponse.json({
      success: true,
      data: {
        payload: payload,
        qr_code: qrCodeUrl,
        image: qrCodeUrl,
        size: "300x300",
        format: "png",
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { payload } = body

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Campo 'payload' é obrigatório no body",
        },
        { status: 400 },
      )
    }

    console.log("🔲 === GERANDO QR CODE (POST) ===")
    console.log("📋 Payload PIX:", payload.slice(0, 50) + "...")

    // Gerar QR Code usando QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=300&format=png&margin=1`

    return NextResponse.json({
      success: true,
      data: {
        payload: payload,
        qr_code: qrCodeUrl,
        image: qrCodeUrl,
        size: "300x300",
        format: "png",
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
