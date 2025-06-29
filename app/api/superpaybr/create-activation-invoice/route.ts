import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💳 Criando fatura de ativação SuperPayBR...")

    const body = await request.json()
    const { customerData } = body

    if (!customerData) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados do cliente são obrigatórios",
        },
        { status: 400 },
      )
    }

    const externalId = `SHEIN_ACTIVATION_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const activationAmount = 1.0 // R$ 1,00 para ativação

    console.log("📄 Criando fatura de ativação:", { externalId, amount: activationAmount })

    // Usar o endpoint de criação de fatura padrão
    const createResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/create-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: activationAmount,
        customerData,
        externalId,
        description: "Ativação do Cartão SHEIN",
      }),
    })

    const createResult = await createResponse.json()

    if (!createResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura de ativação",
          details: createResult.error,
        },
        { status: createResponse.status },
      )
    }

    console.log("✅ Fatura de ativação criada com sucesso:", createResult.data.invoice_id)

    return NextResponse.json({
      success: true,
      message: "Fatura de ativação SuperPayBR criada com sucesso",
      data: {
        ...createResult.data,
        type: "activation",
        description: "Ativação do Cartão SHEIN",
      },
    })
  } catch (error) {
    console.error("❌ Erro ao criar fatura de ativação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura de ativação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
