import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function POST(request: NextRequest) {
  try {
    console.log("📊 === CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    const amount = 1.0 // Valor fixo para IOF

    // Gerar External ID único para IOF
    const externalId = `IOF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    // Dados da fatura de IOF
    const invoiceData = {
      customer: {
        name: body.customerName || "Cliente SHEIN",
        document: (body.customerCpf || "00000000000").replace(/\D/g, ""),
        email: body.customerEmail || "cliente@shein.com",
        phone: (body.customerPhone || "11999999999").replace(/\D/g, ""),
      },
      amount: amount,
      description: "Taxa IOF - Cartão SHEIN",
      external_id: externalId,
      payment_method: "pix",
      due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
      metadata: {
        type: "iof",
        product: "Cartão SHEIN",
        source: "iof",
      },
    }

    console.log("🚀 Criando fatura de IOF...")

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
      console.error("❌ Falha ao criar fatura de IOF:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura de IOF",
          details: errorText,
        },
        { status: 500 },
      )
    }

    const responseData = await createResponse.json()
    console.log("✅ Fatura de IOF criada:", responseData)

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
        description: "Taxa IOF - Cartão SHEIN",
        pix: {
          payload: pixPayload,
          qr_code: qrCodeUrl,
        },
        type: "iof",
      },
    })
  } catch (error) {
    console.error("❌ Erro ao criar fatura de IOF:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura de IOF",
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
      error: "Método GET não suportado. Use POST para criar fatura de IOF.",
    },
    { status: 405 },
  )
}
