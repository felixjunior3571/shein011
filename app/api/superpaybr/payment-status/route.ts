import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID não fornecido",
        },
        { status: 400 },
      )
    }

    console.log("=== CONSULTANDO STATUS SUPERPAYBR ===")
    console.log("Invoice ID:", invoiceId)

    // Obter access token
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authData = await authResponse.json()

    if (!authData.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
        },
        { status: 401 },
      )
    }

    // Consultar fatura específica na SuperPayBR
    const statusResponse = await fetch(`https://api.superpaybr.com/invoices?id=${invoiceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.data.access_token}`,
      },
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log("✅ Status SuperPayBR obtido:", statusData)

      return NextResponse.json({
        success: true,
        data: statusData,
      })
    } else {
      const errorText = await statusResponse.text()
      console.log("❌ Erro ao consultar status SuperPayBR:", statusResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao consultar status: ${statusResponse.status}`,
        },
        { status: statusResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro na consulta de status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na consulta de status",
      },
      { status: 500 },
    )
  }
}
