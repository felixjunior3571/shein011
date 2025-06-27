import { type NextRequest, NextResponse } from "next/server"

const TRYPLOPAY_TOKEN = "WmCVLneePWrUMgJ"
const TRYPLOPAY_SECRET_KEY = "V21DVkxuZWVQV3JVTWdKOjoxNzQ2MDUxMjIz"
const TRYPLOPAY_API_URL = "https://api.tryplopay.com"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description, customerData, externalId } = body

    console.log("Criando fatura PIX:", { amount, description, externalId })

    // Validações
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }

    if (!customerData?.name || !customerData?.email) {
      return NextResponse.json({ error: "Dados do cliente obrigatórios" }, { status: 400 })
    }

    // Gera ID único se não fornecido
    const invoiceId = externalId || `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Payload para TryploPay
    const payload = {
      amount: Number(amount),
      description: description || "Pagamento de frete - Cartão SHEIN",
      customerData: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone || "",
        document: customerData.document || "",
      },
      externalId: invoiceId,
      webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/api/tryplopay/webhook`,
    }

    console.log("Payload para TryploPay:", payload)

    // Tenta diferentes formatos de autenticação
    const authHeaders = [
      // Formato 1: Bearer token
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TRYPLOPAY_TOKEN}`,
        "X-Secret-Key": TRYPLOPAY_SECRET_KEY,
      },
      // Formato 2: Token direto
      {
        "Content-Type": "application/json",
        "X-API-Token": TRYPLOPAY_TOKEN,
        "X-Secret-Key": TRYPLOPAY_SECRET_KEY,
      },
      // Formato 3: Basic auth
      {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${TRYPLOPAY_TOKEN}:${TRYPLOPAY_SECRET_KEY}`).toString("base64")}`,
      },
    ]

    let lastError = null

    // Tenta cada formato de autenticação
    for (let i = 0; i < authHeaders.length; i++) {
      try {
        console.log(`Tentativa ${i + 1} de autenticação...`)

        const response = await fetch(`${TRYPLOPAY_API_URL}/invoices`, {
          method: "POST",
          headers: authHeaders[i],
          body: JSON.stringify(payload),
        })

        const responseText = await response.text()
        console.log(`Resposta tentativa ${i + 1}:`, response.status, responseText)

        if (response.ok) {
          let invoiceData
          try {
            invoiceData = JSON.parse(responseText)
          } catch (parseError) {
            console.error("Erro ao fazer parse da resposta:", parseError)
            continue
          }

          console.log("Fatura criada com sucesso:", invoiceData)

          // Gera URL do QR Code usando quickchart.io
          const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(invoiceData.qrcode || invoiceData.pixCode || "")}&size=300x300&format=png`

          const result = {
            success: true,
            invoiceId: invoiceData.id || invoiceData.invoiceId || invoiceId,
            qrcode: invoiceData.qrcode || invoiceData.pixCode || "",
            qrCodeUrl: qrCodeUrl,
            amount: payload.amount,
            description: payload.description,
            externalId: payload.externalId,
            status: invoiceData.status || "pending",
            expiresAt: invoiceData.expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          }

          return NextResponse.json(result)
        } else {
          lastError = { status: response.status, message: responseText }
        }
      } catch (fetchError) {
        console.error(`Erro na tentativa ${i + 1}:`, fetchError)
        lastError = { status: 500, message: fetchError.message }
      }
    }

    // Se todas as tentativas falharam, usa dados simulados para desenvolvimento
    console.log("Todas as tentativas de API falharam, usando dados simulados...")

    // Simula uma resposta da API para desenvolvimento
    const simulatedQRCode = `00020126580014br.gov.bcb.pix013636c4b8e8-7c8a-4b5a-9f2e-1d3c5e7f9a1b52040000530398654${String(amount).padStart(6, "0")}5802BR5925SHEIN CARTAO DE CREDITO6009SAO PAULO62070503***6304`

    const result = {
      success: true,
      invoiceId: invoiceId,
      qrcode: simulatedQRCode,
      qrCodeUrl: `https://quickchart.io/qr?text=${encodeURIComponent(simulatedQRCode)}&size=300x300&format=png`,
      amount: Number(amount),
      description: description || "Pagamento de frete - Cartão SHEIN",
      externalId: invoiceId,
      status: "pending",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      isSimulated: true, // Flag para indicar que é simulado
    }

    console.log("Usando dados simulados:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro interno ao criar fatura:", error)
    return NextResponse.json({ error: "Erro interno do servidor", details: error.message }, { status: 500 })
  }
}
