import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID não fornecido",
        },
        { status: 400 },
      )
    }

    console.log("=== OBTENDO QRCODE SUPERPAYBR ===")
    console.log("Invoice ID:", invoiceId)

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    // Consultar QR Code na SuperPayBR
    const qrCodeResponse = await fetch(`https://api.superpaybr.com/v4/invoices/qrcode/${invoiceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (qrCodeResponse.ok) {
      const qrCodeData = await qrCodeResponse.json()
      console.log("✅ QR Code SuperPayBR obtido:", qrCodeData)

      return NextResponse.json({
        success: true,
        data: qrCodeData,
      })
    } else {
      const errorText = await qrCodeResponse.text()
      console.log("❌ Erro ao obter QR Code SuperPayBR:", qrCodeResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao obter QR Code: ${qrCodeResponse.status}`,
        },
        { status: qrCodeResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro na obtenção de QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na obtenção de QR Code",
      },
      { status: 500 },
    )
  }
}
