import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💰 Criando fatura SuperPayBR...")

    const body = await request.json()
    const { amount, customerData, externalId } = body

    if (!amount || !customerData || !externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados obrigatórios ausentes",
          required: ["amount", "customerData", "externalId"],
        },
        { status: 400 },
      )
    }

    // Autenticar primeiro
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação",
          details: authResult.error,
        },
        { status: 401 },
      )
    }

    const accessToken = authResult.data.access_token

    // Criar fatura PIX
    console.log("📄 Criando fatura PIX para:", { externalId, amount })

    const invoiceData = {
      external_id: externalId,
      amount: amount,
      description: `Pagamento SHEIN Card - ${externalId}`,
      customer: {
        name: customerData.name,
        email: customerData.email,
        document: customerData.cpf,
        phone: customerData.phone || "",
        address: {
          street: customerData.address?.street || "",
          number: customerData.address?.number || "",
          neighborhood: customerData.address?.neighborhood || "",
          city: customerData.address?.city || "",
          state: customerData.address?.state || "",
          zipcode: customerData.address?.zipcode || "",
        },
      },
      payment_method: "PIX",
      webhook_url: process.env.SUPERPAYBR_WEBHOOK_URL,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    }

    const createResponse = await fetch(`${process.env.SUPERPAYBR_API_URL}/v4/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(invoiceData),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("❌ Erro ao criar fatura SuperPayBR:", {
        status: createResponse.status,
        error: errorText,
      })

      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura SuperPayBR",
          details: errorText,
        },
        { status: createResponse.status },
      )
    }

    const invoiceResult = await createResponse.json()
    console.log("✅ Fatura SuperPayBR criada:", invoiceResult.id)

    // Extrair dados PIX da resposta
    const pixData = extractPixData(invoiceResult)

    if (!pixData.qr_code || !pixData.payload) {
      console.error("❌ Dados PIX não encontrados na resposta")
      return NextResponse.json(
        {
          success: false,
          error: "Dados PIX não encontrados na resposta da API",
          invoice_data: invoiceResult,
        },
        { status: 500 },
      )
    }

    console.log("✅ PIX extraído com sucesso:", {
      qr_code: pixData.qr_code ? "✓" : "✗",
      payload: pixData.payload ? "✓" : "✗",
    })

    return NextResponse.json({
      success: true,
      message: "Fatura SuperPayBR criada com sucesso",
      data: {
        invoice_id: invoiceResult.id,
        external_id: externalId,
        amount: amount,
        status: invoiceResult.status,
        pix: {
          qr_code: pixData.qr_code,
          payload: pixData.payload,
          expires_at: invoiceResult.expires_at,
        },
        created_at: invoiceResult.created_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao criar fatura SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

function extractPixData(invoiceData: any): { qr_code: string; payload: string } {
  console.log("🔍 Extraindo dados PIX da resposta...")

  // Buscar recursivamente por dados PIX
  function findPixRecursively(obj: any): { qr_code?: string; payload?: string } {
    if (!obj || typeof obj !== "object") return {}

    const result: { qr_code?: string; payload?: string } = {}

    for (const [key, value] of Object.entries(obj)) {
      if (key === "qr_code" && typeof value === "string") {
        result.qr_code = value
      }
      if (key === "payload" && typeof value === "string") {
        result.payload = value
      }
      if (key === "pix_code" && typeof value === "string") {
        result.payload = value
      }
      if (key === "qrcode" && typeof value === "string") {
        result.qr_code = value
      }

      if (typeof value === "object" && value !== null) {
        const nested = findPixRecursively(value)
        if (nested.qr_code) result.qr_code = nested.qr_code
        if (nested.payload) result.payload = nested.payload
      }
    }

    return result
  }

  const pixData = findPixRecursively(invoiceData)

  return {
    qr_code: pixData.qr_code || "",
    payload: pixData.payload || "",
  }
}
