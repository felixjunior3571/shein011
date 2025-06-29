import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")
    const amount = searchParams.get("amount") || "34.90"

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Gerando QR Code de emergência SuperPayBR: ${externalId}`)

    const validAmount = Number.parseFloat(amount)

    // PIX payload de emergência
    const emergencyPixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${externalId}520400005303986540${validAmount.toFixed(
      2,
    )}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Gerar QR Code via QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPixPayload)}&size=300&format=png&margin=1`

    console.log("✅ QR Code de emergência gerado")

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        pix: {
          payload: emergencyPixPayload,
          image: qrCodeUrl,
          qr_code: qrCodeUrl,
        },
        amount: validAmount,
        type: "emergency",
      },
    })
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar QR Code",
      },
      { status: 500 },
    )
  }
}
