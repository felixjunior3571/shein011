import { type NextRequest, NextResponse } from "next/server"

// Função para criar Basic Auth header
function createBasicAuthHeader(token: string, secretKey: string): string {
  const credentials = `${token}:${secretKey}`
  const base64Credentials = Buffer.from(credentials).toString("base64")
  return `Basic ${base64Credentials}`
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("[TRYPLOPAY] === CANCELANDO FATURA ===")

    // Verificar variáveis de ambiente
    if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_SECRET_KEY || !process.env.TRYPLOPAY_API_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuração TryploPay incompleta",
          missing: {
            token: !process.env.TRYPLOPAY_TOKEN,
            secret: !process.env.TRYPLOPAY_SECRET_KEY,
            api_url: !process.env.TRYPLOPAY_API_URL,
          },
        },
        { status: 500 },
      )
    }

    // Parse do body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados da requisição inválidos",
        },
        { status: 400 },
      )
    }

    const { id: invoiceId } = body.payment || body

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID da fatura é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("[TRYPLOPAY] Cancelando fatura:", invoiceId)

    // Criar Basic Auth header
    const basicAuthHeader = createBasicAuthHeader(process.env.TRYPLOPAY_TOKEN, process.env.TRYPLOPAY_SECRET_KEY)

    // Payload conforme documentação TryploPay
    const payload = {
      payment: {
        id: invoiceId,
      },
    }

    // Fazer request para TryploPay
    const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader,
        "User-Agent": "SHEIN-Cancel/1.0",
      },
      body: JSON.stringify(payload),
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
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao cancelar fatura: ${response.status}`,
          api_error: data,
        },
        { status: response.status },
      )
    }

    // Processar resposta de sucesso
    console.log("[TRYPLOPAY] ✅ Fatura cancelada com sucesso")

    return NextResponse.json({
      success: true,
      message: "Fatura cancelada com sucesso",
      data,
      invoice_id: invoiceId,
      status: data.fatura?.status?.text || "canceled",
    })
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
