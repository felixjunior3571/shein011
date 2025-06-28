import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")
    const externalId = searchParams.get("externalId")

    if (!invoiceId && !externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID ou External ID deve ser fornecido",
        },
        { status: 400 },
      )
    }

    console.log("=== CONSULTANDO STATUS SUPERPAYBR ===")
    console.log("Invoice ID:", invoiceId)
    console.log("External ID:", externalId)

    // Primeiro, fazer autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const accessToken = authResult.data.access_token

    // Consultar status da fatura
    const statusUrl = `https://api.superpaybr.com/v4/invoices/${invoiceId || externalId}`
    console.log("🔗 URL consulta SuperPayBR:", statusUrl)

    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log("📥 Resposta status SuperPayBR:", {
      status: statusResponse.status,
      statusText: statusResponse.statusText,
      ok: statusResponse.ok,
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log("✅ Status SuperPayBR obtido com sucesso!")

      // Mapear status para nosso formato
      const mappedStatus = {
        isPaid: statusData.fatura?.status?.code === 5,
        isDenied: statusData.fatura?.status?.code === 4,
        isRefunded: statusData.fatura?.status?.code === 8,
        isExpired: statusData.fatura?.status?.code === 7,
        isCanceled: statusData.fatura?.status?.code === 6,
        statusCode: statusData.fatura?.status?.code || 0,
        statusName: statusData.fatura?.status?.title || "Unknown",
        amount: statusData.fatura?.valores?.bruto / 100 || 0,
        paymentDate: statusData.fatura?.paid_at || null,
      }

      return NextResponse.json({
        success: true,
        data: statusData,
        mapped_status: mappedStatus,
      })
    } else {
      const errorText = await statusResponse.text()
      console.log("❌ Erro ao consultar status SuperPayBR:", statusResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao consultar status: ${statusResponse.status} - ${errorText}`,
        },
        { status: statusResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao consultar status",
      },
      { status: 500 },
    )
  }
}
