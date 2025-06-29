import { type NextRequest, NextResponse } from "next/server"

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

    // URL específica para obter QR Code conforme documentação SuperPayBR
    const qrcodeUrl = `https://api.superpaybr.com/invoices/qrcode/${invoiceId}`
    console.log("🔗 URL QR Code SuperPayBR:", qrcodeUrl)

    // Fazer requisição pública para obter QR Code (não precisa de autenticação)
    const qrcodeResponse = await fetch(qrcodeUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("📥 Resposta QR Code SuperPayBR:", {
      status: qrcodeResponse.status,
      statusText: qrcodeResponse.statusText,
      ok: qrcodeResponse.ok,
    })

    if (qrcodeResponse.ok) {
      const qrcodeData = await qrcodeResponse.json()
      console.log("✅ QR Code SuperPayBR obtido com sucesso!")

      return NextResponse.json({
        success: true,
        data: qrcodeData,
        qrcode_url: qrcodeUrl,
      })
    } else {
      const errorText = await qrcodeResponse.text()
      console.log("❌ Erro ao obter QR Code SuperPayBR:", qrcodeResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao obter QR Code: ${qrcodeResponse.status} - ${errorText}`,
          attempted_url: qrcodeUrl,
        },
        { status: qrcodeResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro ao obter QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao obter QR Code",
      },
      { status: 500 },
    )
  }
}
