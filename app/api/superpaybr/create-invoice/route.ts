import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function POST(request: NextRequest) {
  try {
    console.log("💰 === CRIANDO FATURA SUPERPAYBR (MODO REAL) ===")

    const body = await request.json()
    console.log("📥 Dados recebidos:", JSON.stringify(body, null, 2))

    // Extrair dados do body ou headers
    const amount = body.amount || Number.parseFloat(body.amount?.toString() || "34.90")
    const shipping = body.shipping || "sedex"
    const method = body.method || "SEDEX"

    // Dados do cliente dos headers ou body
    const cpfData = body.customerData || JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = body.customerData?.email || request.headers.get("x-user-email") || ""
    const userWhatsApp = body.customerData?.phone || request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = body.customerData?.address || JSON.parse(request.headers.get("x-delivery-address") || "{}")

    // Validar dados obrigatórios
    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Valor (amount) é obrigatório e deve ser maior que zero",
        },
        { status: 400 },
      )
    }

    // Gerar External ID único
    const externalId = body.externalId || `SHEIN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    console.log("📋 Dados processados:", {
      externalId,
      amount,
      customerName: cpfData.nome || body.customerData?.name || "Cliente SHEIN",
      email: userEmail,
      shipping: method,
    })

    // Obter access token de forma segura
    const accessToken = await getSuperPayAccessToken()

    // Preparar dados da fatura SuperPayBR v4
    const invoiceData = {
      customer: {
        name: cpfData.nome || body.customerData?.name || "Cliente SHEIN",
        document: (cpfData.cpf || body.customerData?.cpf || "00000000000").replace(/\D/g, ""),
        email: userEmail || "cliente@shein.com",
        phone: (userWhatsApp || "11999999999").replace(/\D/g, ""),
        address: {
          street: deliveryAddress.street || "Rua Principal",
          number: deliveryAddress.number || "123",
          district: deliveryAddress.neighborhood || "Centro",
          city: deliveryAddress.city || "São Paulo",
          state: deliveryAddress.state || "SP",
          postal_code: (deliveryAddress.zipcode || "01001000").replace(/\D/g, ""),
          complement: deliveryAddress.complement || "",
        },
      },
      amount: amount,
      description: body.description || `Frete ${method} - Cartão SHEIN`,
      external_id: externalId,
      payment_method: "pix",
      due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
      return_url: `${request.nextUrl.origin}/checkout/success`,
      cancel_url: `${request.nextUrl.origin}/checkout`,
      metadata: {
        shipping_method: method,
        product: "Cartão SHEIN",
        source: "checkout",
      },
    }

    console.log("🚀 Enviando para SuperPayBR API v4...")
    console.log("📤 Dados da fatura:", JSON.stringify(invoiceData, null, 2))

    // Criar fatura usando endpoint v4
    const createResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta SuperPayBR v4:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("❌ Falha ao criar fatura SuperPayBR v4:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: "FALHA AO CRIAR FATURA SUPERPAYBR V4",
          details: errorText,
          status: createResponse.status,
        },
        { status: 500 },
      )
    }

    const responseData = await createResponse.json()
    console.log("✅ Fatura criada com sucesso!")
    console.log("📋 Resposta completa:", JSON.stringify(responseData, null, 2))

    // Extrair dados PIX da resposta v4
    let pixPayload = ""
    let qrCodeImage = ""
    let invoiceId = ""

    // Função recursiva para buscar dados PIX
    const findPixData = (obj: any, path = "", depth = 0): void => {
      if (!obj || typeof obj !== "object" || depth > 10) return

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key

        // Buscar ID da fatura
        if ((key === "id" || key === "invoice_id" || key === "payment_id") && typeof value === "string" && !invoiceId) {
          invoiceId = value
          console.log(`🔍 Invoice ID encontrado: ${invoiceId}`)
        }

        // Buscar PIX payload
        if (
          (key === "payload" || key === "pix_code" || key === "qrcode" || key === "pix_payload" || key === "code") &&
          typeof value === "string" &&
          value.length > 50
        ) {
          pixPayload = value
          console.log(`🔍 PIX payload encontrado em: ${currentPath}`)
        }

        // Buscar QR Code image
        if (
          (key === "qrcode_image" ||
            key === "qr_code" ||
            key === "image" ||
            key === "qrcode_url" ||
            key === "qr_image") &&
          typeof value === "string"
        ) {
          qrCodeImage = value
          console.log(`🔍 QR Code encontrado em: ${currentPath}`)
        }

        // Continuar busca recursiva
        if (typeof value === "object" && value !== null) {
          findPixData(value, currentPath, depth + 1)
        }
      }
    }

    findPixData(responseData)

    // Usar dados da resposta ou fallback
    invoiceId = invoiceId || responseData.data?.id || responseData.id || externalId

    console.log("🔍 Resultado da extração PIX:", {
      invoiceId: invoiceId ? "✅ ENCONTRADO" : "❌ NÃO ENCONTRADO",
      pixPayload: pixPayload ? `✅ ENCONTRADO (${pixPayload.length} chars)` : "❌ NÃO ENCONTRADO",
      qrCodeImage: qrCodeImage ? "✅ ENCONTRADO" : "❌ NÃO ENCONTRADO",
    })

    // SE NÃO TEM PIX PAYLOAD, FALHAR COMPLETAMENTE
    if (!pixPayload) {
      console.error("❌ FALHA CRÍTICA: PIX payload não encontrado na resposta!")
      console.error("❌ Resposta completa:", JSON.stringify(responseData, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: "PIX PAYLOAD NÃO ENCONTRADO - IMPOSSÍVEL GERAR PIX REAL",
          response_data: responseData,
        },
        { status: 500 },
      )
    }

    // Gerar QR Code via QuickChart se não tiver imagem
    const qrCodeUrl =
      qrCodeImage || `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    // Resposta no formato esperado
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
          code: responseData.data?.status?.code || responseData.status?.code || 1,
          title: responseData.data?.status?.title || responseData.status?.title || "Aguardando Pagamento",
          text: "pending",
        },
        valores: {
          bruto: Math.round(amount * 100), // SEMPRE definido em centavos
          liquido: Math.round(amount * 100), // SEMPRE definido em centavos
        },
        vencimento: {
          dia: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real", // SEMPRE REAL
      },
    }

    console.log("✅ FATURA SUPERPAYBR V4 CRIADA COM SUCESSO (MODO REAL)!")
    console.log("📋 External ID:", externalId)

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ ERRO CRÍTICO ao criar fatura SuperPayBR v4:", error)
    return NextResponse.json(
      {
        success: false,
        error: "ERRO INTERNO SUPERPAYBR V4 - IMPOSSÍVEL GERAR PIX REAL",
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
      error: "Método GET não suportado. Use POST para criar fatura.",
      help: "Envie uma requisição POST com os dados da fatura no body.",
      endpoint: "https://api.superpaybr.com/v4/invoices",
    },
    { status: 405 },
  )
}
