import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("=== CRIANDO FATURA SUPERPAYBR ===")
    console.log("Dados recebidos:", JSON.stringify(body, null, 2))

    // Obter token de autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      console.log("❌ Erro na autenticação:", authResult.error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro na autenticação SuperPayBR",
          details: authResult.error,
        },
        { status: 401 },
      )
    }

    const accessToken = authResult.data.access_token
    console.log("✅ Token de acesso obtido")

    // Preparar payload para SuperPayBR
    const superPayPayload = {
      client: {
        name: body.customer?.name || "Cliente",
        document: body.customer?.document || "00000000000",
        email: body.customer?.email || "cliente@exemplo.com",
        phone: body.customer?.phone || "11999999999",
        address: {
          street: body.customer?.address?.street || "Rua Exemplo",
          number: body.customer?.address?.number || "123",
          district: body.customer?.address?.district || "Centro",
          city: body.customer?.address?.city || "São Paulo",
          state: body.customer?.address?.state || "SP",
          zipcode: body.customer?.address?.zipcode || "01000000",
          country: "BR",
        },
        ip: body.customer?.ip || "127.0.0.1",
      },
      payment: {
        id: body.external_id || `INVOICE_${Date.now()}`,
        type: "3", // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +1 dia
        referer: body.external_id || `REF_${Date.now()}`,
        installment: "1",
        order_url: body.return_url || `${request.nextUrl.origin}/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: "1",
            image: "https://exemplo.com/produto.png",
            title: body.description || "Produto",
            qnt: "1",
            discount: 0,
            amount: body.amount || 1000, // em centavos
          },
        ],
      },
      shipping: {
        amount: 0.0,
      },
    }

    console.log("📤 Enviando para SuperPayBR:", JSON.stringify(superPayPayload, null, 2))

    // Criar fatura na SuperPayBR
    const invoiceResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(superPayPayload),
    })

    console.log("📥 Resposta SuperPayBR:", {
      status: invoiceResponse.status,
      statusText: invoiceResponse.statusText,
      ok: invoiceResponse.ok,
    })

    if (invoiceResponse.ok) {
      const invoiceData = await invoiceResponse.json()
      console.log("✅ Fatura SuperPayBR criada com sucesso!")

      // Mapear resposta para formato padrão
      const mappedResponse = {
        success: true,
        data: {
          id: invoiceData.fatura?.id,
          invoice_id: invoiceData.fatura?.invoice_id,
          external_id: superPayPayload.payment.id,
          amount: invoiceData.fatura?.valores?.liquido || body.amount,
          status: "pending",
          pix: {
            qr_code: invoiceData.fatura?.pix?.image,
            qr_code_text: invoiceData.fatura?.pix?.payload,
            expires_at: superPayPayload.payment.due_at,
          },
          payment_url: invoiceData.fatura?.externo?.url,
          created_at: new Date().toISOString(),
        },
        raw_response: invoiceData,
      }

      console.log("📋 Resposta mapeada:", JSON.stringify(mappedResponse, null, 2))
      return NextResponse.json(mappedResponse)
    } else {
      const errorText = await invoiceResponse.text()
      console.log("❌ Erro ao criar fatura SuperPayBR:", errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao criar fatura SuperPayBR: ${invoiceResponse.status}`,
          details: errorText,
        },
        { status: invoiceResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar fatura SuperPayBR",
      },
      { status: 500 },
    )
  }
}
