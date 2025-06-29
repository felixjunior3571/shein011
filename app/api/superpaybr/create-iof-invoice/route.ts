import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("💳 Criando fatura de IOF SuperPayBR...")

    const body = await request.json()
    const { leadData, amount = 10.0 } = body

    if (!leadData) {
      return NextResponse.json(
        {
          success: false,
          error: "leadData é obrigatório",
        },
        { status: 400 },
      )
    }

    const externalId = `iof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Criar fatura usando o endpoint principal
    const createResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/create-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        description: "Taxa IOF - Cartão SHEIN",
        externalId: externalId,
        customerName: leadData.name || "Cliente",
        customerEmail: leadData.email || "cliente@exemplo.com",
        customerDocument: leadData.cpf || "00000000000",
      }),
    })

    const createResult = await createResponse.json()

    if (createResult.success) {
      console.log("✅ Fatura de IOF SuperPayBR criada com sucesso!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`🔑 External ID: ${externalId}`)

      return NextResponse.json({
        success: true,
        data: {
          ...createResult.data,
          type: "iof",
          description: "Taxa IOF - Cartão SHEIN",
        },
      })
    } else {
      throw new Error(createResult.error || "Erro ao criar fatura de IOF")
    }
  } catch (error) {
    console.error("❌ Erro ao criar fatura de IOF SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar fatura de IOF SuperPayBR",
      },
      { status: 500 },
    )
  }
}
