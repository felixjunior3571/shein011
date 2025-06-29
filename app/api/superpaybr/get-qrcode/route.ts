import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")
    const pixPayload = searchParams.get("pix_payload")

    if (!externalId && !pixPayload) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id ou pix_payload é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 === GERANDO QR CODE SUPERPAYBR ===")
    console.log("📋 Parâmetros:", { externalId, pixPayload: pixPayload ? "✅ PRESENTE" : "❌ AUSENTE" })

    let finalPixPayload = pixPayload

    // Se não tem PIX payload, buscar no Supabase
    if (!finalPixPayload && externalId) {
      console.log("🔍 Buscando PIX payload no Supabase...")

      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data, error } = await supabase
        .from("superpaybr_payments")
        .select("raw_webhook_data")
        .eq("external_id", externalId)
        .single()

      if (!error && data?.raw_webhook_data) {
        // Buscar PIX payload nos dados do webhook
        const webhookData = data.raw_webhook_data
        finalPixPayload =
          webhookData.pix?.payload ||
          webhookData.pix_payload ||
          webhookData.qrcode ||
          webhookData.payload ||
          webhookData.code

        console.log("✅ PIX payload encontrado no Supabase")
      } else {
        console.log("❌ PIX payload não encontrado no Supabase")
      }
    }

    if (!finalPixPayload) {
      return NextResponse.json(
        {
          success: false,
          error: "PIX payload não encontrado",
        },
        { status: 404 },
      )
    }

    // Gerar QR Code usando QuickChart
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(finalPixPayload)}&size=300&format=png&margin=1&qzone=2`

    console.log("✅ QR Code gerado:", qrCodeUrl)

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        pix_payload: finalPixPayload,
        qr_code_url: qrCodeUrl,
        qr_code_image: qrCodeUrl,
        payload_length: finalPixPayload.length,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao gerar QR Code",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_id, pix_payload } = body

    if (!external_id && !pix_payload) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id ou pix_payload é obrigatório",
        },
        { status: 400 },
      )
    }

    // Redirecionar para GET com query parameters
    const url = new URL(request.url)
    if (external_id) url.searchParams.set("external_id", external_id)
    if (pix_payload) url.searchParams.set("pix_payload", pix_payload)

    return fetch(url.toString(), {
      method: "GET",
      headers: request.headers,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar requisição POST",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
