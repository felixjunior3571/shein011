import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("📊 === CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    console.log("📥 Dados recebidos:", JSON.stringify(body, null, 2))

    const amount = 6.38 // Valor fixo do IOF
    const cpfData = body.customerData || {}
    const userEmail = body.customerData?.email || ""
    const userWhatsApp = body.customerData?.phone || ""

    // Gerar External ID único para IOF
    const externalId = `IOF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    console.log("📋 Dados do IOF:", {
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

    // Fazer autenticação
    let accessToken = token
    try {
      const authResponse = await fetch(`${apiUrl}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token: token,
          secret: secretKey,
        }),
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        accessToken = authData.access_token || authData.token || token
      }
    } catch (error) {
      console.log("⚠️ Usando token direto para IOF")
    }

    // Dados da fatura IOF
    const invoiceData = {
      token: accessToken,
      secret: secretKey,
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
        description: "IOF - Imposto sobre Operações Financeiras",
        amount: amount,
        webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
        return_url: `${request.nextUrl.origin}/iof/success`,
        cancel_url: `${request.nextUrl.origin}/iof`,
      },
    }

    console.log("🚀 Criando fatura IOF...")

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
          error: "Falha ao criar fatura IOF",
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
          error: "PIX payload não encontrado para IOF",
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
        type: "iof",
      },
    }

    console.log("✅ Fatura IOF criada com sucesso!")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura IOF:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura IOF",
      },
      { status: 500 },
    )
  }
}
