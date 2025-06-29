import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")

    if (!invoiceId) {
      console.log("❌ Invoice ID não fornecido")
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

    // URL específica para obter QR Code conforme documentação SuperPayBR v4
    const qrcodeUrl = `https://api.superpaybr.com/v4/invoices/qrcode/${invoiceId}`
    console.log("🔗 URL QR Code SuperPayBR:", qrcodeUrl)

    // Fazer requisição pública para obter QR Code (não precisa de autenticação)
    const startTime = Date.now()
    const qrcodeResponse = await fetch(qrcodeUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SHEIN-Card-App/1.0",
        Accept: "application/json",
      },
    })
    const endTime = Date.now()
    const responseTime = endTime - startTime

    console.log("📥 Resposta QR Code SuperPayBR:", {
      status: qrcodeResponse.status,
      statusText: qrcodeResponse.statusText,
      ok: qrcodeResponse.ok,
      responseTime: `${responseTime}ms`,
      headers: Object.fromEntries(qrcodeResponse.headers.entries()),
    })

    if (qrcodeResponse.ok) {
      const qrcodeData = await qrcodeResponse.json()
      console.log("✅ QR Code SuperPayBR obtido com sucesso!")
      console.log("📋 Dados recebidos:", {
        hasQrCode: !!qrcodeData.qr_code,
        hasImage: !!qrcodeData.image,
        hasUrl: !!qrcodeData.url,
        hasPixCode: !!qrcodeData.pix_code,
        keys: Object.keys(qrcodeData),
        qrCodeUrl: qrcodeData.qr_code?.substring(0, 100) + "...",
      })

      return NextResponse.json({
        success: true,
        data: qrcodeData,
        qrcode_url: qrcodeUrl,
        response_time: responseTime,
        debug: {
          invoice_id: invoiceId,
          api_url: qrcodeUrl,
          response_keys: Object.keys(qrcodeData),
          has_qr_fields: {
            qr_code: !!qrcodeData.qr_code,
            image: !!qrcodeData.image,
            url: !!qrcodeData.url,
            pix_code: !!qrcodeData.pix_code,
          },
        },
      })
    } else {
      let errorData = null
      let errorText = ""

      try {
        errorData = await qrcodeResponse.json()
        errorText = JSON.stringify(errorData)
      } catch {
        errorText = await qrcodeResponse.text()
      }

      console.log("❌ Erro ao obter QR Code SuperPayBR:", {
        status: qrcodeResponse.status,
        statusText: qrcodeResponse.statusText,
        errorData,
        errorText,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao obter QR Code: ${qrcodeResponse.status} - ${qrcodeResponse.statusText}`,
          details: {
            status: qrcodeResponse.status,
            statusText: qrcodeResponse.statusText,
            errorData,
            errorText,
            attempted_url: qrcodeUrl,
            invoice_id: invoiceId,
          },
        },
        { status: qrcodeResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro interno ao obter QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao obter QR Code",
        details: {
          error_message: error instanceof Error ? error.message : "Erro desconhecido",
          error_type: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      { status: 500 },
    )
  }
}
