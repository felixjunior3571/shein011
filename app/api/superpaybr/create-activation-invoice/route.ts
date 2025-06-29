import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function POST(request: NextRequest) {
  try {
    console.log("🎯 === CRIANDO FATURA ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    const amount = 10.0 // Valor fixo para ativação

    // Gerar External ID único para ativação
    const externalId = `ACTIVATION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    // Dados da fatura de ativação
    const invoiceData = {
      customer: {
        name: body.customerName || "Cliente SHEIN",
        document: (body.customerCpf || "00000000000").replace(/\D/g, ""),
        email: body.customerEmail || "cliente@shein.com",
        phone: (body.customerPhone || "11999999999").replace(/\D/g, ""),
      },
      amount: amount,
      description: "Taxa de Ativação - Cartão SHEIN",
      external_id: externalId,
      payment_method: "pix",
      due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
      metadata: {
        type: "activation",
        product: "Cartão SHEIN",
        source: "activation",
      },
    }

    console.log("🚀 Criando fatura de ativação...")

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
    console.log("✅ Fatura de ativação criada:", responseData)

    // Extrair dados PIX
    let pixPayload = ""
    let qrCodeImage = ""

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

    return NextResponse.json({
      success: true,
      data: {
        id: responseData.data?.id || responseData.id || externalId,
        external_id: externalId,
        amount: amount,
        description: "Taxa de Ativação - Cartão SHEIN",
        pix: {
          payload: pixPayload,
          qr_code: qrCodeUrl,
        },
        type: "activation",
      },
    })
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
