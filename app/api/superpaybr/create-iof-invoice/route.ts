import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function POST(request: NextRequest) {
  try {
    console.log("📊 === CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    const amount = 1.0 // Valor fixo para IOF
    const externalId = `IOF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    // Dados da fatura IOF
    const invoiceData = {
      customer: {
        name: body.customerData?.name || "Cliente SHEIN",
        document: (body.customerData?.cpf || "00000000000").replace(/\D/g, ""),
        email: body.customerData?.email || "cliente@shein.com",
        phone: (body.customerData?.phone || "11999999999").replace(/\D/g, ""),
        address: {
          street: "Rua Principal",
          number: "123",
          district: "Centro",
          city: "São Paulo",
          state: "SP",
          postal_code: "01001000",
        },
      },
      amount: amount,
      description: "Taxa IOF - Cartão SHEIN",
      external_id: externalId,
      payment_method: "pix",
      due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
      return_url: `${request.nextUrl.origin}/checkout/success`,
      cancel_url: `${request.nextUrl.origin}/checkout`,
      metadata: {
        type: "iof",
        product: "Cartão SHEIN",
      },
    }

    // Criar fatura
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
      throw new Error(`Falha ao criar fatura IOF: ${errorText}`)
    }

    const responseData = await createResponse.json()

    // Extrair PIX payload
    let pixPayload = ""
    const findPixData = (obj: any): void => {
      if (!obj || typeof obj !== "object") return
      for (const [key, value] of Object.entries(obj)) {
        if (
          (key === "payload" || key === "pix_code" || key === "qrcode") &&
          typeof value === "string" &&
          value.length > 50
        ) {
          pixPayload = value
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

    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    return NextResponse.json({
      success: true,
      data: {
        id: responseData.id || externalId,
        external_id: externalId,
        amount: amount,
        description: "Taxa IOF - Cartão SHEIN",
        pix: {
          payload: pixPayload,
          image: qrCodeUrl,
        },
        status: {
          code: 1,
          title: "Aguardando Pagamento",
          text: "pending",
        },
        type: "real",
      },
    })
  } catch (error) {
    console.error("❌ Erro ao criar fatura IOF:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao criar fatura IOF",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
