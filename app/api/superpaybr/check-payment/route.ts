import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoice_id")
    const externalId = searchParams.get("external_id")

    if (!invoiceId && !externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "invoice_id ou external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 === VERIFICANDO PAGAMENTO SUPERPAYBR ===")
    console.log("📋 Parâmetros:", { invoiceId, externalId })

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    // URLs para verificar pagamento
    const checkUrls = [
      `https://api.superpaybr.com/v4/invoices/${invoiceId || externalId}`,
      `https://api.superpaybr.com/invoices/${invoiceId || externalId}`,
      `https://api.superpaybr.com/v4/payments/${invoiceId || externalId}`,
      `https://api.superpaybr.com/payments/${invoiceId || externalId}`,
    ]

    let checkSuccess = false
    let paymentData = null
    let lastError = null

    for (const checkUrl of checkUrls) {
      try {
        console.log(`🔄 Verificando em: ${checkUrl}`)

        const checkResponse = await fetch(checkUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        console.log(`📥 Resposta de ${checkUrl}:`, {
          status: checkResponse.status,
          statusText: checkResponse.statusText,
          ok: checkResponse.ok,
        })

        if (checkResponse.ok) {
          paymentData = await checkResponse.json()
          console.log("✅ Dados do pagamento obtidos!")
          console.log("📋 Dados:", JSON.stringify(paymentData, null, 2))
          checkSuccess = true
          break
        } else {
          const errorText = await checkResponse.text()
          console.log(`❌ Falha em ${checkUrl}:`, errorText)
          lastError = errorText
        }
      } catch (error) {
        console.log(`❌ Erro em ${checkUrl}:`, error)
        lastError = error
      }
    }

    if (!checkSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível verificar o pagamento",
          details: lastError,
          attempted_urls: checkUrls,
        },
        { status: 404 },
      )
    }

    // Extrair status do pagamento
    const status = paymentData.status || paymentData.payment_status || "unknown"
    const amount = paymentData.amount || paymentData.value || 0
    const isPaid = status === "paid" || status === "approved" || status === "completed"

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: invoiceId,
        external_id: externalId,
        status: status,
        amount: amount,
        is_paid: isPaid,
        payment_data: paymentData,
        checked_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao verificar pagamento SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
