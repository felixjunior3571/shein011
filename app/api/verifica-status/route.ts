import { type NextRequest, NextResponse } from "next/server"
import { getFaturaByToken } from "@/lib/supabase"
import { isTokenExpired, isPaymentSuccessful, isPaymentFailed } from "@/utils/token-generator"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ success: false, error: "Token obrigatório" }, { status: 400 })
    }

    // Buscar fatura no Supabase (NUNCA na SuperPay!)
    const fatura = await getFaturaByToken(token)

    if (!fatura) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 404 })
    }

    // Verificar se o token expirou
    if (isTokenExpired(fatura.expires_at)) {
      return NextResponse.json({
        success: true,
        data: {
          paid: false,
          status: "vencido",
          message: "Token expirado",
        },
      })
    }

    // Determinar resposta baseada no status
    const isPaid = isPaymentSuccessful(fatura.status)
    const isFailed = isPaymentFailed(fatura.status)

    let message = "Aguardando pagamento"
    if (isPaid) {
      message = "Pagamento confirmado!"
    } else if (isFailed) {
      message = `Pagamento ${fatura.status}`
    }

    console.log("🔍 Status consultado:", {
      token: token.substring(0, 8) + "...",
      external_id: fatura.external_id,
      status: fatura.status,
      paid: isPaid,
    })

    return NextResponse.json({
      success: true,
      data: {
        paid: isPaid,
        status: fatura.status,
        message,
        external_id: fatura.external_id,
        amount: fatura.amount,
        expires_at: fatura.expires_at,
        updated_at: fatura.updated_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
