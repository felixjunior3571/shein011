import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 TESTANDO CONEXÃO SUPERPAYBR...")

    // Testar autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    console.log("📥 Resultado da autenticação:", authResult)

    if (!authResult.success) {
      throw new Error(`Falha na autenticação: ${authResult.error}`)
    }

    const accessToken = authResult.data.access_token

    // Testar conexão direta com SuperPayBR (sem criar fatura)
    const testResponse = await fetch("https://api.superpaybr.com/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    console.log("📥 Resposta do teste SuperPayBR:", {
      status: testResponse.status,
      statusText: testResponse.statusText,
      ok: testResponse.ok,
    })

    const connectionData = {
      auth_success: authResult.success,
      access_token_received: !!accessToken,
      api_connection_status: testResponse.status,
      api_connection_ok: testResponse.ok,
      timestamp: new Date().toISOString(),
    }

    if (testResponse.ok) {
      console.log("✅ Conexão SuperPayBR bem-sucedida!")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPayBR testada com sucesso",
        data: connectionData,
      })
    } else {
      const errorText = await testResponse.text()
      console.log("❌ Erro na conexão SuperPayBR:", testResponse.status, errorText)

      return NextResponse.json({
        success: false,
        message: "Erro na conexão SuperPayBR",
        data: connectionData,
        error: `${testResponse.status}: ${errorText}`,
      })
    }
  } catch (error) {
    console.log("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido no teste de conexão SuperPayBR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
