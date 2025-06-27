import { type NextRequest, NextResponse } from "next/server"

// Função para criar Basic Auth header
function createBasicAuthHeader(token: string, secretKey: string): string {
  const credentials = `${token}:${secretKey}`
  const base64Credentials = Buffer.from(credentials).toString("base64")
  return `Basic ${base64Credentials}`
}

export async function GET(request: NextRequest) {
  try {
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

    // Obter parâmetros da query
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("p") || "1"
    const invoiceId = searchParams.get("id")

    // Criar Basic Auth header
    const basicAuthHeader = createBasicAuthHeader(process.env.TRYPLOPAY_TOKEN, process.env.TRYPLOPAY_SECRET_KEY)

    // Construir URL com parâmetros
    let apiUrl = `${process.env.TRYPLOPAY_API_URL}/invoices`
    const params = new URLSearchParams()

    if (page) params.append("p", page)
    if (invoiceId) params.append("id", invoiceId)

    if (params.toString()) {
      apiUrl += `?${params.toString()}`
    }

    console.log("[TRYPLOPAY] Listando faturas:", apiUrl)

    // Fazer request para TryploPay
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader,
        "User-Agent": "SHEIN-List/1.0",
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
      return NextResponse.json(
        {
          success: false,
          error: `Erro da API TryploPay: ${response.status}`,
          api_error: data,
        },
        { status: response.status },
      )
    }

    // Processar resposta de sucesso
    console.log("[TRYPLOPAY] ✅ Faturas listadas com sucesso")

    return NextResponse.json({
      success: true,
      data,
      pagination: data.pages || null,
      total: data.total || null,
      invoices: data.invoices || [],
      request_params: {
        page,
        invoice_id: invoiceId,
      },
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
