import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💳 === CRIANDO FATURA DE ATIVAÇÃO SUPERPAYBR ===")

    const body = await request.json()
    const { customerData } = body

    if (!customerData?.name || !customerData?.cpf || !customerData?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados do cliente obrigatórios: name, cpf, email",
        },
        { status: 400 },
      )
    }

    const externalId = `ACTIVATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const amount = 9.9 // Taxa de ativação

    console.log("📋 Criando fatura de ativação:", { externalId, amount, customer: customerData.name })

    // Usar o endpoint principal de criação
    const invoiceResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/create-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        customerData,
        externalId,
        description: "Taxa de Ativação - Cartão SHEIN",
      }),
    })

    const invoiceResult = await invoiceResponse.json()

    if (invoiceResult.success) {
      console.log("✅ Fatura de ativação criada:", invoiceResult.data.invoice_id)

      return NextResponse.json({
        success: true,
        message: "Fatura de ativação criada com sucesso",
        data: {
          ...invoiceResult.data,
          type: "activation",
          description: "Taxa de Ativação - Cartão SHEIN",
        },
      })
    } else {
      console.error("❌ Erro ao criar fatura de ativação:", invoiceResult.error)
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura de ativação",
          details: invoiceResult.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ Erro na criação da fatura de ativação:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na criação da fatura de ativação",
      },
      { status: 500 },
    )
  }
}
