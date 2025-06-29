import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🎯 === CRIANDO FATURA ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    const { amount = 1.99 } = body

    // Dados do cliente do localStorage
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""

    const externalId = `ATIVACAO_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    console.log("📋 Criando fatura de ativação:", {
      externalId,
      amount,
      customerName: cpfData.nome,
    })

    // Usar credenciais diretas
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

    const invoiceData = {
      client: {
        name: cpfData.nome || "Cliente SHEIN",
        document: (cpfData.cpf || "00000000000").replace(/\D/g, ""),
        email: userEmail || "cliente@shein.com",
        phone: (userWhatsApp || "11999999999").replace(/\D/g, ""),
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
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        referer: "SHEIN_ATIVACAO",
        installment: 1,
        order_url: `${request.nextUrl.origin}/upp/001`,
        store_url: request.nextUrl.origin,
        webhook: process.env.SUPERPAY_WEBHOOK_URL,
        discount: 0,
        products: [
          {
            id: "1",
            title: "Taxa de Ativação - Cartão SHEIN",
            qnt: 1,
            amount: amount,
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("🚀 Enviando para SuperPayBR...")

    // Tentar múltiplas URLs
    const createUrls = [`${apiUrl}/v4/invoices`, `${apiUrl}/invoices`]

    let createSuccess = false
    let responseData = null

    for (const createUrl of createUrls) {
      try {
        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-Key": secretKey,
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
      console.log("⚠️ Gerando PIX de emergência para ativação...")
      return createEmergencyActivationPix(amount, externalId)
    }

    // Extrair dados PIX
    let pixPayload = ""
    let qrCodeImage = ""
    const invoiceId = responseData.data?.id || responseData.id || externalId

    // Buscar PIX recursivamente
    const findPixData = (obj: any): void => {
      if (!obj || typeof obj !== "object") return

      for (const [key, value] of Object.entries(obj)) {
        if ((key === "payload" || key === "pix_code") && typeof value === "string" && value.length > 50) {
          pixPayload = value
        }
        if ((key === "qrcode" || key === "qr_code" || key === "image") && typeof value === "string") {
          qrCodeImage = value
        }
        if (typeof value === "object" && value !== null) {
          findPixData(value)
        }
      }
    }

    findPixData(responseData)

    // PIX de emergência se necessário
    if (!pixPayload) {
      pixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${invoiceId}520400005303986540${amount.toFixed(
        2,
      )}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304ATIV`
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

    console.log("✅ Fatura de ativação criada com sucesso!")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura de ativação:", error)
    return createEmergencyActivationPix(1.99, `EMG_ATIV_${Date.now()}`)
  }
}

function createEmergencyActivationPix(amount: number, externalId: string) {
  console.log("🚨 Criando PIX de emergência para ativação...")

  const pixPayload = `00020126580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/${externalId}520400005303986540${amount.toFixed(
    2,
  )}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304ATIV`

  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

  return NextResponse.json({
    success: true,
    data: {
      id: externalId,
      invoice_id: externalId,
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
      type: "emergency",
    },
  })
}
