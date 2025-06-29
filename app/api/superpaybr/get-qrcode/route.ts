import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoiceId")

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: "Invoice ID é obrigatório" }, { status: 400 })
    }

    console.log("🔍 Buscando QR Code SuperPayBR para invoice:", invoiceId)

    // Verificar se temos as variáveis de ambiente necessárias
    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN

    if (!apiUrl || !token) {
      console.error("❌ Variáveis de ambiente SuperPayBR não configuradas")
      return NextResponse.json(
        { success: false, error: "Configuração da API SuperPayBR não encontrada" },
        { status: 500 },
      )
    }

    // Fazer requisição para a API SuperPayBR
    const response = await fetch(`${apiUrl}/v4/invoice/${invoiceId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("❌ Erro na API SuperPayBR:", response.status, response.statusText)
      return NextResponse.json(
        { success: false, error: `Erro na API SuperPayBR: ${response.status}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("✅ Resposta da API SuperPayBR:", data)

    // Extrair dados do QR Code
    const qrCodeData = {
      qr_code: data?.pix?.qr_code || data?.qr_code,
      image: data?.pix?.image || data?.image,
      payload: data?.pix?.payload || data?.payload,
      pix_code: data?.pix?.pix_code || data?.pix_code,
    }

    return NextResponse.json({
      success: true,
      data: qrCodeData,
    })
  } catch (error) {
    console.error("❌ Erro interno ao buscar QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
