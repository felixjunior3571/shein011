import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🏦 === CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    const { customerData, loanAmount } = body

    if (!customerData?.name || !customerData?.cpf || !loanAmount) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados obrigatórios: customerData (name, cpf) e loanAmount",
        },
        { status: 400 },
      )
    }

    const externalId = `IOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const iofAmount = Math.round(loanAmount * 0.0038 * 100) / 100 // IOF 0.38%

    console.log("📋 Criando fatura IOF:", {
      externalId,
      loanAmount,
      iofAmount,
      customer: customerData.name,
    })

    // Usar o endpoint principal de criação
    const invoiceResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/create-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: iofAmount,
        customerData,
        externalId,
        description: `IOF sobre empréstimo de R$ ${loanAmount.toFixed(2)}`,
      }),
    })

    const invoiceResult = await invoiceResponse.json()

    if (invoiceResult.success) {
      console.log("✅ Fatura IOF criada:", invoiceResult.data.invoice_id)

      return NextResponse.json({
        success: true,
        message: "Fatura IOF criada com sucesso",
        data: {
          ...invoiceResult.data,
          type: "iof",
          loan_amount: loanAmount,
          iof_rate: 0.0038,
          description: `IOF sobre empréstimo de R$ ${loanAmount.toFixed(2)}`,
        },
      })
    } else {
      console.error("❌ Erro ao criar fatura IOF:", invoiceResult.error)
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura IOF",
          details: invoiceResult.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ Erro na criação da fatura IOF:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na criação da fatura IOF",
      },
      { status: 500 },
    )
  }
}
