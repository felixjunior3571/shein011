import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        {
          error: "Token obrigatório",
          message: "Forneça o token de verificação",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Verificando status para token:", token)

    // Buscar fatura pelo token
    const { data: invoice, error } = await supabase.from("faturas").select("*").eq("token", token).single()

    if (error || !invoice) {
      console.error("❌ Fatura não encontrada para token:", token)
      return NextResponse.json(
        {
          error: "Token inválido ou expirado",
        },
        { status: 404 },
      )
    }

    // Verificar se token expirou
    const now = new Date()
    const expiresAt = new Date(invoice.expires_at)

    if (now > expiresAt) {
      console.log("⏰ Token expirado:", token)
      return NextResponse.json(
        {
          error: "Token expirado",
          expired_at: invoice.expires_at,
        },
        { status: 410 },
      )
    }

    console.log(`📊 Status atual: ${invoice.status} | External ID: ${invoice.external_id}`)
    console.log(`🎯 Tipo de redirecionamento: ${invoice.redirect_type}`)

    // Verificar status do pagamento
    switch (invoice.status) {
      case "pago":
        console.log("✅ PAGAMENTO CONFIRMADO! Liberando redirecionamento")

        // Determinar URL de redirecionamento baseado no tipo
        let redirectUrl = "/obrigado" // fallback
        if (invoice.redirect_type === "checkout") {
          redirectUrl = "/upp/001"
          console.log("🚀 Redirecionando para /upp/001 (checkout)")
        } else if (invoice.redirect_type === "activation") {
          redirectUrl = "/upp10"
          console.log("🚀 Redirecionando para /upp10 (activation)")
        }

        return NextResponse.json({
          paid: true,
          redirect: redirectUrl,
          redirect_type: invoice.redirect_type,
          external_id: invoice.external_id,
          paid_at: invoice.paid_at,
          gateway: invoice.gateway,
          pay_id: invoice.pay_id,
        })

      case "pendente":
      case "processando":
      case "aguardando":
      case "em_analise":
        return NextResponse.json({
          status: "aguardando",
          message: "Aguardando confirmação do pagamento",
          external_id: invoice.external_id,
          redirect_type: invoice.redirect_type,
          created_at: invoice.created_at,
        })

      case "recusado":
        return NextResponse.json(
          {
            status: "recusado",
            message: "Pagamento foi recusado",
            error: "Pagamento recusado pelo banco ou operadora",
          },
          { status: 402 },
        )

      case "cancelado":
        return NextResponse.json(
          {
            status: "cancelado",
            message: "Pagamento foi cancelado",
            error: "Pagamento cancelado",
          },
          { status: 410 },
        )

      case "estornado":
        return NextResponse.json(
          {
            status: "estornado",
            message: "Pagamento foi estornado",
            error: "Pagamento estornado",
          },
          { status: 410 },
        )

      case "vencido":
        return NextResponse.json(
          {
            status: "vencido",
            message: "Pagamento venceu",
            error: "Prazo para pagamento expirou",
          },
          { status: 410 },
        )

      default:
        return NextResponse.json({
          status: invoice.status,
          message: "Status desconhecido",
          superpay_status: {
            code: invoice.superpay_status_code,
            title: invoice.superpay_status_title,
            description: invoice.superpay_status_description,
          },
        })
    }
  } catch (error) {
    console.error("💥 Erro ao verificar status:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
