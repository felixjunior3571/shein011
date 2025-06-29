import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔐 === AUTENTICAÇÃO TRYPLOPAY ===")

    const token = process.env.TRYPLOPAY_TOKEN
    const secretKey = process.env.TRYPLOPAY_SECRET_KEY
    const apiUrl = process.env.TRYPLOPAY_API_URL || "https://api.tryplopay.com"

    console.log("📋 Verificando credenciais TryploPay:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ Não encontrado",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ Não encontrado",
      apiUrl,
    })

    if (!token || !secretKey) {
      console.log("❌ Credenciais TryploPay não encontradas")
      return NextResponse.json({
        success: false,
        error: "Credenciais não configuradas",
        fallback: true,
        data: {
          working: "SIMULATION",
          message: "Usando modo simulação - credenciais não encontradas",
        },
      })
    }

    // Fazer autenticação na TryploPay
    const authPayload = {
      token: token,
      secret: secretKey,
    }

    console.log("📤 Enviando requisição de autenticação...")

    const response = await fetch(`${apiUrl}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authPayload),
    })

    console.log("📥 Resposta da autenticação TryploPay:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (response.ok) {
      const data = await response.json()
      console.log("✅ Autenticação TryploPay bem-sucedida")

      return NextResponse.json({
        success: true,
        data: {
          access_token: data.access_token,
          account: data.account,
          working: "PRODUCTION",
        },
      })
    } else {
      const errorText = await response.text()
      console.log("❌ Erro na autenticação TryploPay:", errorText)

      return NextResponse.json({
        success: false,
        error: `Erro ${response.status}: ${errorText}`,
        fallback: true,
        data: {
          working: "SIMULATION",
          message: "Falha na autenticação - usando simulação",
        },
      })
    }
  } catch (error) {
    console.log("❌ Erro na autenticação TryploPay:", error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      fallback: true,
      data: {
        working: "SIMULATION",
        message: "Erro de conexão - usando simulação",
      },
    })
  }
}
