import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== VERIFICANDO PAGAMENTO ===")

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID da fatura não fornecido",
        },
        { status: 400 },
      )
    }

    // Obter access token
    const authResponse = await fetch(`${request.nextUrl.origin}/api/tryplopay/auth`)
    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error("Falha na autenticação")
    }

    const { access_token } = authData.data
    const isSimulation = authData.fallback || authData.data.working === "SIMULATION"

    let paymentStatus

    if (!isSimulation && !invoiceId.startsWith("SIM_")) {
      // Verificar pagamento real
      console.log("🔄 Verificando pagamento real...")

      const apiUrl = process.env.TRYPLOPAY_API_URL || "https://api.tryplopay.com"

      const response = await fetch(`${apiUrl}/invoices?id=${invoiceId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const invoice = data.invoices?.[0] || data.fatura

        paymentStatus = {
          isPaid: invoice.status.code === 5, // Status 5 = Pago
          status: invoice.status,
          invoice: invoice,
        }

        console.log("✅ Status verificado:", paymentStatus.isPaid ? "PAGO" : "PENDENTE")
      } else {
        throw new Error(`Erro na API: ${response.status}`)
      }
    } else {
      // Simulação - 10% de chance de estar pago após 30 segundos
      const invoiceAge = Date.now() - Number.parseInt(invoiceId.replace("SIM_", ""))
      const isPaid = invoiceAge > 30000 && Math.random() < 0.1

      paymentStatus = {
        isPaid,
        status: {
          code: isPaid ? 5 : 1,
          title: isPaid ? "Pago" : "Aguardando Pagamento",
          text: isPaid ? "paid" : "pending",
        },
        invoice: {
          id: invoiceId,
          type: "simulated",
        },
      }

      console.log("✅ Status simulado:", paymentStatus.isPaid ? "PAGO" : "PENDENTE")
    }

    return NextResponse.json({
      success: true,
      data: paymentStatus,
    })
  } catch (error) {
    console.log("❌ Erro ao verificar pagamento:", error)

    // Fallback - sempre pendente em caso de erro
    return NextResponse.json({
      success: true,
      data: {
        isPaid: false,
        status: {
          code: 1,
          title: "Aguardando Pagamento",
          text: "pending",
        },
        error: "Erro na verificação, assumindo pendente",
      },
      fallback: true,
    })
  }
}
