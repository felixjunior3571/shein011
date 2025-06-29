import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consultando status SuperPayBR:", externalId)

    // ⚠️ TIMEOUT para evitar requisições travadas
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 segundos

    // 1. Autenticar
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      signal: controller.signal,
    })
    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error(`Erro na autenticação: ${authData.error}`)
    }

    // 2. Consultar status
    const statusUrl = `${process.env.SUPERPAYBR_API_URL}/invoice/${externalId}`

    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const statusResponseText = await statusResponse.text()
    console.log("📥 Resposta SuperPayBR Status:", statusResponseText.substring(0, 200))

    if (!statusResponse.ok) {
      throw new Error(`HTTP ${statusResponse.status}: ${statusResponse.statusText}`)
    }

    let statusResult
    try {
      statusResult = JSON.parse(statusResponseText)
    } catch (parseError) {
      throw new Error(`Erro ao parsear JSON: ${statusResponseText}`)
    }

    if (statusResult.success && statusResult.data) {
      const invoice = statusResult.data
      const status = invoice.status || {}

      const isPaid = status.code === 5
      const isDenied = status.code === 12
      const isExpired = status.code === 15
      const isCanceled = status.code === 6
      const isRefunded = status.code === 9

      console.log("✅ Status SuperPayBR obtido:", {
        isPaid,
        statusCode: status.code,
        statusName: status.title,
      })

      return NextResponse.json({
        success: true,
        isPaid,
        isDenied,
        isExpired,
        isCanceled,
        isRefunded,
        statusCode: status.code,
        statusName: status.title,
        amount: invoice.prices?.total || 0,
        paymentDate: isPaid ? invoice.payment?.payDate || new Date().toISOString() : null,
      })
    } else {
      throw new Error(statusResult.message || "Erro ao consultar status SuperPayBR")
    }
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao consultar status SuperPayBR",
      },
      { status: 500 },
    )
  }
}
