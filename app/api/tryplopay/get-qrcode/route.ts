import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[TRYPLOPAY] === OBTENDO QR CODE ===")

    // Verificar variável de ambiente da API URL
    if (!process.env.TRYPLOPAY_API_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "URL da API TryploPay não configurada",
        },
        { status: 500 },
      )
    }

    // Obter ID da fatura da URL
    const { pathname } = new URL(request.url)
    const invoiceId = pathname.split("/").pop()

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID da fatura é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("[TRYPLOPAY] Obtendo QR Code para fatura:", invoiceId)

    // Este endpoint é PÚBLICO conforme documentação - não precisa de autenticação
    const apiUrl = `${process.env.TRYPLOPAY_API_URL}/invoices/qrcode/${invoiceId}`

    // Fazer request para TryploPay
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-QRCode/1.0",
      },
    })

    const responseText = await response.text()
    console.log("[TRYPLOPAY] Response status:", response.status)
    console.log("[TRYPLOPAY] Response body:", responseText.substring(0, 500))

    // Parse da resposta
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[TRYPLOPAY] Erro ao fazer parse da resposta:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Resposta inválida da API TryploPay",
          raw_response: responseText.substring(0, 500),
        },
        { status: 502 },
      )
    }

    // Verificar se houve erro
    if (!response.ok) {
      console.error("[TRYPLOPAY] Erro da API:", data)

      // Erro 404 é comum quando a fatura não existe
      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Fatura não encontrada",
            invoice_id: invoiceId,
            api_error: data,
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao obter QR Code: ${response.status}`,
          api_error: data,
        },
        { status: response.status },
      )
    }

    // Processar resposta de sucesso
    console.log("[TRYPLOPAY] ✅ QR Code obtido com sucesso")

    // A resposta pode conter diferentes formatos dependendo da API
    const qrCodeData = {
      success: true,
      invoice_id: invoiceId,
      qr_code_url: data.qr_code_url || data.qrcode || data.image,
      pix_code: data.pix_code || data.payload,
      data,
    }

    return NextResponse.json(qrCodeData)
  } catch (error) {
    console.error("[TRYPLOPAY] Erro geral:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
