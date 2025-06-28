import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID não fornecido",
        },
        { status: 400 },
      )
    }

    console.log("=== CONSULTANDO STATUS SUPERPAYBR ===")
    console.log("External ID:", externalId)

    // Primeiro, fazer autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const accessToken = authResult.data.access_token

    // Consultar fatura por ID (usando o endpoint de listagem)
    const statusResponse = await fetch(`https://api.superpaybr.com/invoices?id=${externalId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log("📥 Resposta Status SuperPayBR:", {
      status: statusResponse.status,
      statusText: statusResponse.statusText,
      ok: statusResponse.ok,
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log("✅ Status SuperPayBR obtido com sucesso!")

      // Mapear status
      const invoice = statusData.invoices?.[0]
      if (invoice) {
        const isPaid = invoice.status.code === 5
        const isDenied = invoice.status.code === 12
        const isExpired = invoice.status.code === 15

        return NextResponse.json({
          success: true,
          data: {
            external_id: externalId,
            status_code: invoice.status.code,
            status_title: invoice.status.title,
            is_paid: isPaid,
            is_denied: isDenied,
            is_expired: isExpired,
            amount: invoice.prices.total,
            payment_date: invoice.payment.date,
          },
          raw_response: statusData,
        })
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Fatura não encontrada",
          },
          { status: 404 },
        )
      }
    } else {
      const errorText = await statusResponse.text()
      console.log("❌ Erro ao consultar status SuperPayBR:", statusResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR: ${statusResponse.status} - ${errorText}`,
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
