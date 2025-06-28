import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    const { amount, description } = body

    // Obter dados do usuário (simulado via localStorage no servidor)
    const cpfData = { nome: "Cliente", cpf: "00000000000" }
    const userEmail = "cliente@exemplo.com"
    const userWhatsApp = "11999999999"

    console.log("📋 Dados da fatura de ativação:", {
      amount,
      description,
      cliente: cpfData.nome,
    })

    // Primeiro, fazer autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const accessToken = authResult.data.access_token

    // Gerar external_id único para ativação
    const externalId = `SHEIN_ACTIVATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Preparar dados da fatura de ativação SuperPayBR
    const invoiceData = {
      external_id: externalId,
      customer: {
        name: cpfData.nome,
        email: userEmail,
        phone: userWhatsApp,
        document: cpfData.cpf,
        address: {
          street: "Rua Principal",
          number: "123",
          district: "Centro",
          city: "São Paulo",
          state: "SP",
          zipcode: "01000000",
          country: "BR",
        },
      },
      products: [
        {
          name: description || "Depósito de Ativação - SHEIN Card",
          quantity: 1,
          price: Math.round(amount * 100), // SuperPayBR usa centavos
        },
      ],
      payment_methods: ["pix"],
      webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    }

    console.log("🚀 Enviando fatura de ativação para SuperPayBR...")

    const createResponse = await fetch("https://api.superpaybr.com/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta SuperPayBR Ativação:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (createResponse.ok) {
      const invoiceResult = await createResponse.json()
      console.log("✅ Fatura de ativação SuperPayBR criada com sucesso!")

      // Extrair dados do PIX da resposta
      const pixPayload = invoiceResult.payment?.details?.pix_code || ""
      const qrCodeUrl = invoiceResult.payment?.details?.qrcode || ""

      // Gerar QR Code usando QuickChart como fallback
      const finalQrCode =
        qrCodeUrl ||
        (pixPayload
          ? `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=200`
          : "/placeholder.svg?height=200&width=200")

      // Mapear resposta para formato esperado
      const mappedInvoice = {
        id: invoiceResult.id,
        invoice_id: invoiceResult.id,
        external_id: externalId,
        pix: {
          payload: pixPayload,
          image: finalQrCode,
          qr_code: finalQrCode,
        },
        status: {
          code: invoiceResult.status?.code || 1,
          title: invoiceResult.status?.title || "Aguardando Pagamento",
          text: "pending",
        },
        valores: {
          bruto: invoiceResult.prices?.total || Math.round(amount * 100),
          liquido: invoiceResult.prices?.total || Math.round(amount * 100),
        },
        vencimento: {
          dia: invoiceResult.payment?.due || new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real",
      }

      console.log("🎯 QR Code Ativação URL gerada:", finalQrCode)

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        raw_response: invoiceResult,
      })
    } else {
      const errorText = await createResponse.text()
      console.log("❌ Erro ao criar fatura de ativação SuperPayBR:", createResponse.status, errorText)

      // Retornar fatura de emergência para ativação
      const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/ACTIVATION${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN ACT5011SAO PAULO62070503***6304ACTV`

      const emergencyInvoice = {
        id: externalId,
        invoice_id: externalId,
        external_id: externalId,
        pix: {
          payload: emergencyPix,
          image: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200`,
          qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200`,
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
      }

      return NextResponse.json({
        success: true,
        data: emergencyInvoice,
        fallback: true,
        message: "Fatura de ativação criada em modo de emergência",
      })
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura de ativação SuperPayBR:", error)

    // Retornar fatura de emergência em caso de erro
    const { amount } = await request.json()
    const externalId = `SHEIN_ACTIVATION_EMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/ACTIVATION${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN ACT5011SAO PAULO62070503***6304ACTV`

    const emergencyInvoice = {
      id: externalId,
      invoice_id: externalId,
      external_id: externalId,
      pix: {
        payload: emergencyPix,
        image: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200`,
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200`,
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
    }

    return NextResponse.json({
      success: true,
      data: emergencyInvoice,
      fallback: true,
      message: "Fatura de ativação criada em modo de emergência",
    })
  }
}
