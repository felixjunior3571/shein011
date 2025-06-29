import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 Gerando QR Code de emergência SuperPayBR: ${externalId}`)

    // PIX payload de emergência
    const emergencyPixPayload =
      "00020101021226580014br.gov.bcb.pix2536pix-qr.mercadopago.com/instore/o/v2/b8d7f1c5-8b2a-4c3d-9e1f-2a3b4c5d6e7f5204000053039865802BR5925SHEIN CARTAO DE CREDITO6009SAO PAULO62070503***6304A1B2"

    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPixPayload)}&size=300`

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        pix: {
          payload: emergencyPixPayload,
          image: qrCodeUrl,
          qr_code: qrCodeUrl,
        },
        type: "emergency",
        message: "QR Code de emergência gerado",
      },
    })
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
