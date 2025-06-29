import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pixCode = searchParams.get("pix_code")
    const size = searchParams.get("size") || "200"

    if (!pixCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Código PIX é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Gerando QR Code SuperPayBR para PIX:", pixCode.substring(0, 50) + "...")

    // Gerar QR Code usando QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=${size}`

    console.log("✅ QR Code SuperPayBR gerado:", qrCodeUrl)

    return NextResponse.json({
      success: true,
      qr_code_url: qrCodeUrl,
      pix_code: pixCode,
      size: Number.parseInt(size),
    })
  } catch (error) {
    console.log("❌ Erro ao gerar QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao gerar QR Code SuperPayBR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pix_code, size = 200 } = body

    if (!pix_code) {
      return NextResponse.json(
        {
          success: false,
          error: "Código PIX é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Gerando QR Code SuperPayBR via POST para PIX:", pix_code.substring(0, 50) + "...")

    // Gerar QR Code usando QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pix_code)}&size=${size}`

    console.log("✅ QR Code SuperPayBR gerado via POST:", qrCodeUrl)

    return NextResponse.json({
      success: true,
      qr_code_url: qrCodeUrl,
      pix_code: pix_code,
      size: Number.parseInt(size),
    })
  } catch (error) {
    console.log("❌ Erro ao gerar QR Code SuperPayBR via POST:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao gerar QR Code SuperPayBR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
