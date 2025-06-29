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

    console.log("=== OBTENDO QRCODE SUPERPAYBR V4 ===")
    console.log("Invoice ID:", invoiceId)

    // URL CORRETA conforme documentação SuperPayBR v4
    const qrcodeUrl = `https://api.superpaybr.com/v4/invoices/qrcode/${invoiceId}`
    console.log("🔗 URL QR Code SuperPayBR v4:", qrcodeUrl)

    // Fazer requisição pública para obter QR Code (CONSULTA PÚBLICA - não precisa de autenticação)
    const startTime = Date.now()
    const qrcodeResponse = await fetch(qrcodeUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SHEIN-Card-App/1.0",
        Accept: "application/json",
      },
    })
    const responseTime = Date.now() - startTime

    console.log("📥 Resposta QR Code SuperPayBR v4:", {
      status: qrcodeResponse.status,
      statusText: qrcodeResponse.statusText,
      ok: qrcodeResponse.ok,
      responseTime: `${responseTime}ms`,
      url: qrcodeUrl,
    })

    if (qrcodeResponse.ok) {
      const qrcodeData = await qrcodeResponse.json()
      console.log("✅ QR Code SuperPayBR v4 obtido com sucesso!")
      console.log("📋 Estrutura da resposta:", {
        keys: Object.keys(qrcodeData),
        hasQrCode: !!qrcodeData.qr_code,
        hasImage: !!qrcodeData.image,
        hasUrl: !!qrcodeData.url,
      })

      return NextResponse.json({
        success: true,
        data: qrcodeData,
        qrcode_url: qrcodeUrl,
        invoice_id: invoiceId,
        response_time: responseTime,
        api_version: "v4",
        source: "superpaybr_v4_api",
      })
    } else {
      // Tratar erros conforme formato da documentação SuperPayBR
      let errorData = null
      try {
        errorData = await qrcodeResponse.json()
      } catch {
        errorData = { message: await qrcodeResponse.text() }
      }

      console.log("❌ Erro SuperPayBR v4:", {
        status: qrcodeResponse.status,
        errorData,
      })

      // Tratamento específico para erro 404 conforme documentação
      if (qrcodeResponse.status === 404) {
        console.log("📋 Fatura não encontrada (404):", {
          error: errorData?.error,
          message: errorData?.message,
          seconds: errorData?.__seconds,
        })

        return NextResponse.json(
          {
            success: false,
            error: "Fatura não encontrada",
            message: errorData?.message || "Sorry, we couldn't find this invoice id.",
            invoice_id: invoiceId,
            attempted_url: qrcodeUrl,
            api_response: errorData,
            __seconds: errorData?.__seconds,
            api_version: "v4",
          },
          { status: 404 },
        )
      }

      // Outros erros
      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR v4: ${qrcodeResponse.status}`,
          message: errorData?.message || qrcodeResponse.statusText,
          details: errorData,
          attempted_url: qrcodeUrl,
          invoice_id: invoiceId,
          api_version: "v4",
        },
        { status: qrcodeResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro interno SuperPayBR v4:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: "Falha na comunicação com SuperPayBR v4",
        details: error instanceof Error ? error.message : String(error),
        api_version: "v4",
      },
      { status: 500 },
    )
  }
}
