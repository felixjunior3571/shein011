import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💰 === CRIANDO FATURA SUPERPAYBR (BASIC AUTH) ===")

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

    // Credenciais SuperPayBR
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    if (!token || !secretKey || !apiUrl) {
      console.error("❌ Credenciais SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas - IMPOSSÍVEL GERAR PIX REAL",
        },
        { status: 500 },
      )
    }

    // PASSO 1: Fazer autenticação Basic Auth
    console.log("🔐 Fazendo autenticação Basic Auth...")

    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    let accessToken = null

    // URLs de autenticação para tentar
    const authUrls = [`${apiUrl}/auth`, `${apiUrl}/token`, `${apiUrl}/oauth/token`, `${apiUrl}/authenticate`]

    for (const authUrl of authUrls) {
      try {
        console.log(`🔑 Tentando autenticação em: ${authUrl}`)

        const authResponse = await fetch(authUrl, {
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

        console.log(`📥 Resposta auth de ${authUrl}:`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok,
        })

        if (authResponse.ok) {
          const authData = await authResponse.json()
          accessToken = authData.access_token || authData.token
          console.log("✅ Access token obtido:", accessToken ? `${accessToken.substring(0, 20)}...` : "❌ NULO")

          if (accessToken) {
            break // Sair do loop se conseguiu o token
          }
        } else {
          const errorText = await authResponse.text()
          console.log(`❌ Falha auth em ${authUrl}:`, errorText)
        }
      } catch (error) {
        console.log(`❌ Erro auth em ${authUrl}:`, error)
      }
    }

    // SE NÃO CONSEGUIU ACCESS TOKEN, FALHAR COMPLETAMENTE
    if (!accessToken) {
      console.error("❌ FALHA CRÍTICA: Não foi possível obter access token SuperPayBR")
      return NextResponse.json(
        {
          success: false,
          error: "FALHA NA AUTENTICAÇÃO SUPERPAYBR - IMPOSSÍVEL GERAR PIX REAL",
          details: "Access token não obtido com Basic Auth",
        },
        { status: 401 },
      )
    }

    // PASSO 2: Criar fatura com Bearer token
    console.log("💳 Criando fatura com Bearer token...")

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
        external_id: externalId,
        type: "pix",
        due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        description: body.description || `Frete ${method} - Cartão SHEIN`,
        amount: amount,
        webhook_url: process.env.SUPERPAY_WEBHOOK_URL,
        return_url: `${request.nextUrl.origin}/checkout/success`,
        cancel_url: `${request.nextUrl.origin}/checkout`,
      },
    }

    console.log("🚀 Enviando para SuperPayBR API com Bearer token...")
    console.log("📤 Dados da fatura:", JSON.stringify(invoiceData, null, 2))

    // URLs para criação
    const createUrls = [
      `${apiUrl}/invoices`,
      `${apiUrl}/payment`,
      `${apiUrl}/create`,
      `${apiUrl}/pix`,
      `${apiUrl}/invoice/create`,
    ]

    let createSuccess = false
    let responseData = null
    let lastError = null

    for (const createUrl of createUrls) {
      try {
        console.log(`🔄 Tentando criar fatura em: ${createUrl}`)

        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(invoiceData),
        })

        console.log(`📥 Resposta de ${createUrl}:`, {
          status: createResponse.status,
          statusText: createResponse.statusText,
          ok: createResponse.ok,
        })

        if (createResponse.ok) {
          responseData = await createResponse.json()
          console.log("✅ Fatura criada com sucesso!")
          console.log("📋 Resposta completa:", JSON.stringify(responseData, null, 2))
          createSuccess = true
          break
        } else {
          const errorText = await createResponse.text()
          console.log(`❌ Falha em ${createUrl}:`, errorText)
          lastError = errorText
        }
      } catch (error) {
        console.log(`❌ Erro de rede em ${createUrl}:`, error)
        lastError = error
      }
    }

    // SE NÃO CONSEGUIU CRIAR FATURA, FALHAR COMPLETAMENTE
    if (!createSuccess) {
      console.error("❌ FALHA CRÍTICA: Não foi possível criar fatura SuperPayBR")
      console.error("❌ Último erro:", lastError)
      return NextResponse.json(
        {
          success: false,
          error: "FALHA AO CRIAR FATURA SUPERPAYBR - IMPOSSÍVEL GERAR PIX REAL",
          details: lastError,
          attempted_urls: createUrls,
        },
        { status: 500 },
      )
    }

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

    console.log("✅ FATURA SUPERPAYBR CRIADA COM SUCESSO (MODO REAL + BASIC AUTH)!")
    console.log("📋 Resposta formatada:", JSON.stringify(response, null, 2))

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ ERRO CRÍTICO ao criar fatura SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "ERRO INTERNO SUPERPAYBR - IMPOSSÍVEL GERAR PIX REAL",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Adicionar suporte para outros métodos HTTP
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST para criar fatura.",
    },
    { status: 405 },
  )
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

export async function PATCH(request: NextRequest) {
  return POST(request)
}
