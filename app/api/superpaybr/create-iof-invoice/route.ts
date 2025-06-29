import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("📊 Criando fatura IOF SuperPayBR...")

    const body = await request.json()
    const { customerData, shippingMethod } = body

    if (!customerData || !shippingMethod) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados do cliente e método de envio são obrigatórios",
        },
        { status: 400 },
      )
    }

    // Calcular valor do IOF baseado no método de envio
    const iofAmounts = {
      sedex: 34.9,
      express: 49.9,
      pac: 24.9,
    }

    const iofAmount = iofAmounts[shippingMethod as keyof typeof iofAmounts] || 34.9
    const externalId = `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    console.log("📄 Criando fatura IOF:", {
      externalId,
      amount: iofAmount,
      shippingMethod,
    })

    // Usar o endpoint de criação de fatura padrão
    const createResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/create-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: iofAmount,
        customerData,
        externalId,
        description: `Taxa IOF - Envio ${shippingMethod.toUpperCase()}`,
      }),
    })

    const createResult = await createResponse.json()

    if (!createResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao criar fatura IOF",
          details: createResult.error,
        },
        { status: createResponse.status },
      )
    }

    console.log("✅ Fatura IOF criada com sucesso:", createResult.data.invoice_id)

    return NextResponse.json({
      success: true,
      message: "Fatura IOF SuperPayBR criada com sucesso",
      data: {
        ...createResult.data,
        type: "iof",
        shipping_method: shippingMethod,
        description: `Taxa IOF - Envio ${shippingMethod.toUpperCase()}`,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao criar fatura IOF SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura IOF",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
