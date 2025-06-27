import { type NextRequest, NextResponse } from "next/server"

const TRYPLOPAY_SECRET_KEY = "V21DVkxuZWVQV3JVTWdKOjoxNzQ2MDUxMjIz"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Webhook recebido:", body)

    // Validação básica do webhook
    const signature = request.headers.get("x-signature")
    console.log("Signature recebida:", signature)

    // Aqui você pode implementar validação de assinatura se necessário
    // const isValid = validateSignature(body, signature, TRYPLOPAY_SECRET_KEY)

    const { invoiceId, status, amount, paidAt, externalId } = body

    console.log("Dados do webhook:", {
      invoiceId,
      status,
      amount,
      paidAt,
      externalId,
    })

    // Se o pagamento foi aprovado
    if (status === "paid" || status === "approved" || status === "completed") {
      console.log(`✅ Pagamento aprovado! Fatura: ${invoiceId}, Valor: ${amount}`)

      // Aqui você pode:
      // 1. Atualizar banco de dados
      // 2. Enviar email de confirmação
      // 3. Processar pedido
      // 4. Notificar outros sistemas

      // Por enquanto, apenas logamos
      console.log("Processando pagamento aprovado...")
    }

    // Resposta de sucesso para TryploPay
    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
    })
  } catch (error) {
    console.error("Erro no webhook:", error)
    return NextResponse.json({ error: "Erro ao processar webhook", details: error.message }, { status: 500 })
  }
}
