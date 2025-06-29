import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("id")

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID da fatura é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Buscando QR Code SuperPayBR para fatura:", invoiceId)

    // Fazer autenticação primeiro
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    if (!authResult.success) {
      throw new Error(`Falha na autenticação SuperPayBR: ${authResult.error}`)
    }

    const accessToken = authResult.data.access_token

    // Buscar QR Code na SuperPayBR
    const qrCodeResponse = await fetch(`https://api.superpaybr.com/invoices/qrcode/${invoiceId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    console.log("📥 Resposta QR Code SuperPayBR:", {
      status: qrCodeResponse.status,
      statusText: qrCodeResponse.statusText,
      ok: qrCodeResponse.ok,
    })

    if (qrCodeResponse.ok) {
      const qrCodeData = await qrCodeResponse.json()
      console.log("✅ QR Code SuperPayBR obtido com sucesso!")

      return NextResponse.json({
        success: true,
        data: qrCodeData,
        message: "QR Code SuperPayBR obtido com sucesso",
      })
    } else {
      const errorText = await qrCodeResponse.text()
      console.log("❌ Erro ao obter QR Code SuperPayBR:", qrCodeResponse.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Erro SuperPayBR ${qrCodeResponse.status}: ${errorText}`,
        },
        { status: qrCodeResponse.status },
      )
    }
  } catch (error) {
    console.log("❌ Erro ao obter QR Code SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao obter QR Code SuperPayBR",
      },
      { status: 500 },
    )
  }
}
