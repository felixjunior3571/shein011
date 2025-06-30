import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { superPayService } from "@/lib/superpay"
import { generateSecureToken, generateExternalId, getExpirationTime } from "@/utils/token-generator"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description, customer } = body

    // Validações básicas
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }

    // Gerar identificadores únicos
    const external_id = generateExternalId()
    const token = generateSecureToken()
    const expires_at = getExpirationTime(15) // 15 minutos

    console.log("🚀 Iniciando checkout:", { external_id, amount })

    // Criar fatura na SuperPay
    const invoice = await superPayService.createInvoice({
      external_id,
      amount,
      description: description || "Frete PAC - Cartão SHEIN",
      customer,
    })

    // Salvar no Supabase
    const { data: fatura, error: supabaseError } = await supabase
      .from("faturas")
      .insert({
        external_id,
        token,
        status: "pendente",
        invoice_id: invoice.id,
        qr_code: invoice.qr_code,
        pix_code: invoice.pix_code,
        amount,
        expires_at: expires_at.toISOString(),
      })
      .select()
      .single()

    if (supabaseError) {
      console.error("❌ Erro Supabase:", supabaseError)
      throw new Error("Erro ao salvar fatura")
    }

    console.log("✅ Checkout criado com sucesso:", fatura)

    return NextResponse.json({
      success: true,
      token,
      external_id,
      qr_code: invoice.qr_code,
      pix_code: invoice.pix_code,
      amount,
      expires_at: expires_at.toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Erro no checkout:", error)
    return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 })
  }
}
