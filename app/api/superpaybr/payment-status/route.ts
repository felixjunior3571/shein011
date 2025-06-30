import { type NextRequest, NextResponse } from "next/server"
import { globalPaymentConfirmations } from "../webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID ou Invoice ID deve ser fornecido",
        },
        { status: 400 },
      )
    }

    console.log("=== CONSULTANDO STATUS SUPERPAYBR ===")
    console.log("External ID:", externalId)
    console.log("Invoice ID:", invoiceId)

    // Primeiro, verificar cache global de confirmações (mais rápido)
    if (externalId) {
      const cachedConfirmation = globalPaymentConfirmations.get(externalId)
      if (cachedConfirmation) {
        console.log(`✅ Status encontrado no cache global: ${externalId}`)
        return NextResponse.json({
          success: true,
          data: cachedConfirmation,
          source: "global_cache",
        })
      }
    }

    // Se não encontrou no cache, fazer consulta na API SuperPayBR
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
    const queryParam = invoiceId ? `id=${invoiceId}` : `external_id=${externalId}`
    const statusResponse = await fetch(`https://api.superpaybr.com/invoices?${queryParam}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.data.access_token}`,
      },
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log("✅ Status SuperPayBR obtido da API:", statusData)

      // Processar resposta da API
      const invoice = statusData.fatura || statusData
      const isPaid = invoice.status?.code === 5
      const isDenied = invoice.status?.code === 12
      const isExpired = invoice.status?.code === 15
      const isCanceled = invoice.status?.code === 6
      const isRefunded = invoice.status?.code === 9

      const processedData = {
        isPaid,
        isDenied,
        isExpired,
        isCanceled,
        isRefunded,
        statusCode: invoice.status?.code || 1,
        statusName: invoice.status?.title || "Aguardando",
        amount: (invoice.valores?.bruto || 0) / 100,
        paymentDate: invoice.payment?.payDate || new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        externalId: invoice.external_id || externalId,
        invoiceId: invoice.id || invoiceId,
      }

      // Salvar no cache global se for um status final
      if (isPaid || isDenied || isExpired || isCanceled || isRefunded) {
        globalPaymentConfirmations.set(processedData.externalId, processedData)
        console.log(`💾 Status final salvo no cache global: ${processedData.externalId}`)
      }

      return NextResponse.json({
        success: true,
        data: processedData,
        source: "superpaybr_api",
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
