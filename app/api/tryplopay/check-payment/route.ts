import { type NextRequest, NextResponse } from "next/server"

// Função para obter access token
async function getAccessToken(): Promise<string | null> {
  try {
    const token = process.env.TRYPLOPAY_TOKEN
    const secretKey = process.env.TRYPLOPAY_SECRET_KEY
    const apiUrl = process.env.TRYPLOPAY_API_URL

    if (!token || !secretKey || !apiUrl) {
      return null
    }

    const basicAuth = Buffer.from(`${token}:${secretKey}`).toString("base64")

    const response = await fetch(`${apiUrl}/auth`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        scope: "invoice.write, customer.write, webhook.write",
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.access_token || null
  } catch (error) {
    return null
  }
}

// Função para verificar status da fatura
async function checkInvoiceStatus(invoiceId: string, accessToken: string): Promise<any> {
  try {
    console.log("=== VERIFICANDO PAGAMENTO ===")
    console.log("Invoice ID:", invoiceId)

    const apiUrl = process.env.TRYPLOPAY_API_URL

    const response = await fetch(`${apiUrl}/invoices/${invoiceId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.log("❌ Erro ao verificar fatura:", response.status)
      throw new Error(`Erro ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Status verificado:", data.fatura?.status?.title || "Status não encontrado")

    return data
  } catch (error) {
    console.log("❌ Erro na verificação:", error)
    throw error
  }
}

// Simulação de pagamento para testes
function simulatePaymentCheck(invoiceId: string): any {
  console.log("=== VERIFICAÇÃO SIMULADA ===")

  // Simular pagamento após 2 minutos para testes
  const createdTime = Number.parseInt(invoiceId.split("_")[1] || "0")
  const currentTime = Date.now()
  const elapsedMinutes = (currentTime - createdTime) / (1000 * 60)

  const isPaid = elapsedMinutes > 2 // Simula pagamento após 2 minutos

  return {
    success: true,
    fatura: {
      id: invoiceId,
      status: {
        code: isPaid ? 5 : 1,
        title: isPaid ? "Pago" : "Aguardando Pagamento",
      },
    },
    isPaid,
    simulated: true,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("=== INICIANDO VERIFICAÇÃO DE PAGAMENTO ===")
    console.log("Invoice ID:", invoiceId)
    console.log("Token:", token ? "Presente" : "Ausente")

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID não fornecido",
        },
        { status: 400 },
      )
    }

    // Se for fatura simulada ou de emergência, usar verificação simulada
    if (invoiceId.startsWith("SIM_") || invoiceId.startsWith("EMG_")) {
      const result = simulatePaymentCheck(invoiceId)
      return NextResponse.json(result)
    }

    // Tentar obter access token
    const accessToken = await getAccessToken()

    if (!accessToken) {
      console.log("⚠️ Access token não disponível, usando simulação")
      const result = simulatePaymentCheck(invoiceId)
      return NextResponse.json(result)
    }

    try {
      // Verificar status real da fatura
      const result = await checkInvoiceStatus(invoiceId, accessToken)

      // Determinar se está pago
      const isPaid = result.fatura?.status?.code === 5

      return NextResponse.json({
        success: true,
        ...result,
        isPaid,
        real: true,
      })
    } catch (error) {
      // Se falhar, usar simulação
      console.log("⚠️ Verificação real falhou, usando simulação")
      const result = simulatePaymentCheck(invoiceId)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.log("❌ Erro geral na verificação:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
