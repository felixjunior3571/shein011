import { type NextRequest, NextResponse } from "next/server"

const TRYPLOPAY_TOKEN = "WmCVLneePWrUMgJ"
const TRYPLOPAY_SECRET_KEY = "V21DVkxuZWVQV3JVTWdKOjoxNzQ2MDUxMjIz"
const TRYPLOPAY_API_URL = "https://api.tryplopay.com"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")

    if (!invoiceId) {
      return NextResponse.json({ error: "ID da fatura obrigatório" }, { status: 400 })
    }

    console.log("Verificando status da fatura:", invoiceId)

    // Se for uma fatura simulada, simula o status
    if (invoiceId.includes("invoice_")) {
      // Simula diferentes status baseado no tempo
      const now = Date.now()
      const invoiceTime = Number.parseInt(invoiceId.split("_")[1]) || now
      const timeDiff = now - invoiceTime

      let status = "pending"

      // Simula aprovação após 30 segundos para teste
      if (timeDiff > 30000) {
        status = "paid"
      }

      const result = {
        success: true,
        invoiceId: invoiceId,
        status: status,
        amount: 34.9, // Valor padrão
        paidAt: status === "paid" ? new Date().toISOString() : null,
        expiresAt: new Date(invoiceTime + 5 * 60 * 1000).toISOString(),
        isSimulated: true,
      }

      console.log("Status simulado:", result)
      return NextResponse.json(result)
    }

    // Tenta consultar na API real
    try {
      const response = await fetch(`${TRYPLOPAY_API_URL}/invoices/${invoiceId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TRYPLOPAY_TOKEN}`,
          "X-Secret-Key": TRYPLOPAY_SECRET_KEY,
        },
      })

      if (response.ok) {
        const invoiceData = await response.json()
        console.log("Status da fatura:", invoiceData)

        return NextResponse.json({
          success: true,
          invoiceId: invoiceData.id || invoiceData.invoiceId,
          status: invoiceData.status,
          amount: invoiceData.amount,
          paidAt: invoiceData.paidAt || null,
          expiresAt: invoiceData.expiresAt || null,
        })
      }
    } catch (apiError) {
      console.error("Erro na API, usando fallback:", apiError)
    }

    // Fallback: retorna status pending
    return NextResponse.json({
      success: true,
      invoiceId: invoiceId,
      status: "pending",
      amount: 34.9,
      paidAt: null,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      isSimulated: true,
    })
  } catch (error) {
    console.error("Erro ao verificar status:", error)
    return NextResponse.json({ error: "Erro interno do servidor", details: error.message }, { status: 500 })
  }
}
