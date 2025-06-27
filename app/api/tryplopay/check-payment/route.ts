import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("=== VERIFICANDO PAGAMENTO ===")
    console.log("Invoice ID:", invoiceId)

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID não fornecido",
        },
        { status: 400 },
      )
    }

    // Verificar se é fatura simulada
    if (invoiceId.startsWith("SIM_") || invoiceId.startsWith("EMG_")) {
      console.log("🔄 Verificando fatura simulada...")

      // Simular pagamento após 2 minutos para teste
      const invoiceTimestamp = Number.parseInt(invoiceId.split("_")[1] || "0")
      const currentTime = Date.now()
      const elapsedTime = currentTime - invoiceTimestamp

      // Se passou mais de 2 minutos, considerar como pago (para teste)
      const isPaid = elapsedTime > 120000 // 2 minutos

      console.log(`Tempo decorrido: ${Math.floor(elapsedTime / 1000)}s - Pago: ${isPaid}`)

      return NextResponse.json({
        success: true,
        data: {
          isPaid,
          status: isPaid ? 5 : 1,
          statusText: isPaid ? "Pago" : "Aguardando Pagamento",
        },
      })
    }

    // Para faturas reais, consultar a API da TryploPay
    const authResponse = await fetch(`${request.nextUrl.origin}/api/tryplopay/auth`)
    const authData = await authResponse.json()

    if (!authData.success || authData.fallback) {
      // Se não conseguir autenticar, simular resposta
      return NextResponse.json({
        success: true,
        data: {
          isPaid: false,
          status: 1,
          statusText: "Aguardando Pagamento",
        },
      })
    }

    const { access_token } = authData.data
    const apiUrl = process.env.TRYPLOPAY_API_URL || "https://api.tryplopay.com"

    // Consultar status na API real
    const response = await fetch(`${apiUrl}/invoices?id=${invoiceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      const isPaid = data.fatura?.status?.code === 5

      console.log(`✅ Status consultado: ${data.fatura?.status?.title} (${data.fatura?.status?.code})`)

      return NextResponse.json({
        success: true,
        data: {
          isPaid,
          status: data.fatura?.status?.code || 1,
          statusText: data.fatura?.status?.title || "Aguardando Pagamento",
        },
      })
    } else {
      throw new Error(`Erro na consulta: ${response.status}`)
    }
  } catch (error) {
    console.log("❌ Erro ao verificar pagamento:", error)

    return NextResponse.json({
      success: true,
      data: {
        isPaid: false,
        status: 1,
        statusText: "Aguardando Pagamento",
      },
    })
  }
}
