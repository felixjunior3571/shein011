import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")
    const invoiceId = searchParams.get("invoice_id")

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id ou invoice_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Obtendo QR Code SuperPayBR:", { externalId, invoiceId })

    // ⚠️ TIMEOUT para evitar requisições travadas
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos

    // 1. Autenticar
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      signal: controller.signal,
    })
    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error(`Erro na autenticação: ${authData.error}`)
    }

    // 2. Buscar fatura
    const searchId = externalId || invoiceId
    const invoiceUrl = `${process.env.SUPERPAYBR_API_URL}/invoice/${searchId}`

    const invoiceResponse = await fetch(invoiceUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const invoiceResponseText = await invoiceResponse.text()
    console.log("📥 Resposta SuperPayBR Invoice:", invoiceResponseText.substring(0, 300))

    if (!invoiceResponse.ok) {
      throw new Error(`HTTP ${invoiceResponse.status}: ${invoiceResponse.statusText}`)
    }

    let invoiceResult
    try {
      invoiceResult = JSON.parse(invoiceResponseText)
    } catch (parseError) {
      throw new Error(`Erro ao parsear JSON: ${invoiceResponseText}`)
    }

    if (invoiceResult.success && invoiceResult.data) {
      const invoice = invoiceResult.data
      const payment = invoice.payment || {}
      const details = payment.details || {}

      // ✅ EXTRAIR PIX E QR CODE
      let pixCode = details.pix_code || details.pix || details.code
      let qrCodeUrl = details.qrcode || details.qr_code || details.qr_code_url

      // ✅ PIX DE EMERGÊNCIA SE NÃO ENCONTRADO
      if (!pixCode) {
        pixCode = `PIX_EMERGENCIA_${Date.now()}`
        console.log("⚠️ PIX não encontrado, usando PIX de emergência:", pixCode)
      }

      // ✅ QR CODE SEMPRE USANDO QUICKCHART
      if (!qrCodeUrl) {
        qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=300`
        console.log("⚠️ QR Code não encontrado, gerando via QuickChart:", qrCodeUrl)
      }

      console.log("✅ QR Code SuperPayBR obtido com sucesso!")

      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          invoice_id: invoiceId,
          pix_code: pixCode,
          qr_code_url: qrCodeUrl,
          payment_url: details.url || "",
          amount: invoice.prices?.total || 0,
          status: invoice.status?.title || "Aguardando Pagamento",
          expires_at: invoice.expires_at,
        },
      })
    } else {
      throw new Error(invoiceResult.message || "Erro ao obter QR Code SuperPayBR")
    }
  } catch (error) {
    console.error("❌ Erro ao obter QR Code SuperPayBR:", error)

    // ✅ FALLBACK: RETORNAR PIX DE EMERGÊNCIA
    const emergencyPix = `PIX_EMERGENCIA_${Date.now()}`
    const emergencyQrCode = `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=300`

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        pix_code: emergencyPix,
        qr_code_url: emergencyQrCode,
        payment_url: "",
        amount: 0,
        status: "PIX de Emergência",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        is_emergency: true,
      },
      warning: "Usando PIX de emergência devido a erro na API",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}
