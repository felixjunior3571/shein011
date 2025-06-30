import { type NextRequest, NextResponse } from "next/server"
import { superPayService } from "@/lib/superpay"
import { createFatura } from "@/lib/supabase"
import { generateExternalId, generateSecureToken, getExpirationTime } from "@/utils/token-generator"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, customer } = body

    // Validações básicas
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Valor inválido" }, { status: 400 })
    }

    if (!customer?.name || !customer?.email || !customer?.document) {
      return NextResponse.json({ success: false, error: "Dados do cliente obrigatórios" }, { status: 400 })
    }

    // Gerar IDs únicos
    const external_id = generateExternalId()
    const token = generateSecureToken()
    const expires_at = getExpirationTime(15) // 15 minutos

    console.log("🔄 Iniciando checkout:", { external_id, amount })

    // Criar fatura na SuperPay
    const superPayInvoice = await superPayService.createInvoice({
      amount,
      external_id,
      customer,
      description: `Frete - Cartão SHEIN - ${external_id}`,
      expires_at: expires_at.toISOString(),
    })

    // Salvar no Supabase
    const fatura = await createFatura({
      external_id,
      token,
      status: "pendente",
      amount,
      invoice_id: superPayInvoice.id,
      qr_code: superPayInvoice.pix.qr_code,
      pix_code: superPayInvoice.pix.payload,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_document: customer.document,
      expires_at: expires_at.toISOString(),
    })

    console.log("✅ Checkout criado:", fatura.id)

    // Retornar dados para o frontend
    return NextResponse.json({
      success: true,
      data: {
        token,
        external_id,
        qr_code: superPayInvoice.pix.qr_code,
        pix_code: superPayInvoice.pix.payload,
        amount,
        expires_at: expires_at.toISOString(),
        invoice_id: superPayInvoice.id,
      },
    })
  } catch (error) {
    console.error("❌ Erro no checkout:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
