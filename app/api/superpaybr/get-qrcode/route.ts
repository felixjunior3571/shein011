import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payload = searchParams.get("payload")

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "payload é obrigatório",
        },
        { status: 400 },
      )
    }

    // Gerar QR Code via QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=300&format=png&margin=1`

    return NextResponse.json({
      success: true,
      data: {
        qr_code: qrCodeUrl,
        payload: payload,
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
    const payload = body.payload

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "payload é obrigatório",
        },
        { status: 400 },
      )
    }

    // Gerar QR Code via QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=300&format=png&margin=1`

    return NextResponse.json({
      success: true,
      data: {
        qr_code: qrCodeUrl,
        payload: payload,
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
