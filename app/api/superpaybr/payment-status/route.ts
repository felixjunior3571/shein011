import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consultando status SuperPayBR:", externalId)

    // Credenciais SuperPayBR
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    if (!token || !secretKey || !apiUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    // Fazer autenticação primeiro
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    let accessToken = null

    try {
      const authResponse = await fetch(`${apiUrl}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${base64Credentials}`,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
        }),
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        accessToken = authData.access_token || authData.token
      }
    } catch (error) {
      console.log("❌ Erro na autenticação:", error)
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
        },
        { status: 401 },
      )
    }

    // Consultar status do pagamento
    const statusUrls = [
      `${apiUrl}/payments/${externalId}`,
      `${apiUrl}/invoices/${externalId}`,
      `${apiUrl}/payment/status/${externalId}`,
      `${apiUrl}/status/${externalId}`,
    ]

    let statusData = null

    for (const statusUrl of statusUrls) {
      try {
        console.log(`🔄 Consultando: ${statusUrl}`)

        const statusResponse = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (statusResponse.ok) {
          statusData = await statusResponse.json()
          console.log("✅ Status obtido:", statusData)
          break
        }
      } catch (error) {
        console.log(`❌ Erro em ${statusUrl}:`, error)
      }
    }

    if (!statusData) {
      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível consultar o status do pagamento",
        },
        { status: 404 },
      )
    }

    // Processar dados de status
    let isPaid = false
    let isDenied = false
    let status = "pending"

    // Buscar status recursivamente
    const findStatus = (obj: any): void => {
      if (!obj || typeof obj !== "object") return

      for (const [key, value] of Object.entries(obj)) {
        if (key === "status" && typeof value === "string") {
          status = value
          const statusLower = value.toLowerCase()
          if (statusLower.includes("paid") || statusLower.includes("pago")) {
            isPaid = true
          } else if (statusLower.includes("denied") || statusLower.includes("negado")) {
            isDenied = true
          }
        }

        if (typeof value === "object" && value !== null) {
          findStatus(value)
        }
      }
    }

    findStatus(statusData)

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        status: status,
        is_paid: isPaid,
        is_denied: isDenied,
        raw_data: statusData,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const externalId = body.external_id

  if (!externalId) {
    return NextResponse.json(
      {
        success: false,
        error: "External ID é obrigatório",
      },
      { status: 400 },
    )
  }

  // Redirecionar para GET com query parameter
  const url = new URL(request.url)
  url.searchParams.set("external_id", externalId)

  return fetch(url.toString(), {
    method: "GET",
    headers: request.headers,
  })
}
