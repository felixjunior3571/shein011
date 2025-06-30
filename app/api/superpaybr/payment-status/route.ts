import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")

    console.log("🔍 [SuperPayBR Status] Iniciando verificação:")
    console.log("- External ID:", externalId)
    console.log("- Invoice ID:", invoiceId)

    if (!externalId && !invoiceId) {
      console.log("❌ [SuperPayBR Status] Nenhum ID fornecido")
      return NextResponse.json(
        {
          success: false,
          error: "External ID ou Invoice ID é obrigatório",
          data: {
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: false,
            statusCode: 1,
            statusName: "ID não fornecido",
          },
        },
        { status: 400 },
      )
    }

    // 1. Primeiro verificar localStorage simulado global
    if (externalId) {
      console.log("💾 [SuperPayBR Status] Verificando localStorage simulado...")

      try {
        const localStorageKey = `webhook_payment_${externalId}`

        // Verificar se existe localStorage simulado global
        if (typeof global !== "undefined" && global.webhookLocalStorage) {
          const webhookData = global.webhookLocalStorage.get(localStorageKey)

          if (webhookData) {
            const parsedData = JSON.parse(webhookData)
            console.log("✅ [SuperPayBR Status] Dados encontrados no localStorage simulado:", parsedData)

            return NextResponse.json({
              success: true,
              data: parsedData,
              source: "webhook_localStorage",
              timestamp: new Date().toISOString(),
            })
          }
        }

        console.log("⚠️ [SuperPayBR Status] Nenhum dado encontrado no localStorage simulado")
      } catch (error) {
        console.log("❌ [SuperPayBR Status] Erro ao verificar localStorage:", error)
      }
    }

    // 2. Verificar variáveis de ambiente
    const SUPERPAYBR_TOKEN = process.env.SUPERPAYBR_TOKEN
    const SUPERPAYBR_SECRET_KEY = process.env.SUPERPAYBR_SECRET_KEY
    const SUPERPAYBR_API_URL = process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com"

    console.log("🔧 [SuperPayBR Status] Verificando configurações:")
    console.log("- API URL:", SUPERPAYBR_API_URL)
    console.log("- Token configurado:", !!SUPERPAYBR_TOKEN)
    console.log("- Secret Key configurado:", !!SUPERPAYBR_SECRET_KEY)

    if (!SUPERPAYBR_TOKEN || !SUPERPAYBR_SECRET_KEY) {
      console.log("❌ [SuperPayBR Status] Credenciais não configuradas")

      return NextResponse.json({
        success: false,
        error: "Credenciais SuperPayBR não configuradas",
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: 1,
          statusName: "Credenciais não configuradas",
        },
        source: "config_error",
        timestamp: new Date().toISOString(),
      })
    }

    // 3. Tentar obter token de autenticação
    console.log("🔐 [SuperPayBR Status] Obtendo token de autenticação...")

    let accessToken = SUPERPAYBR_TOKEN

    try {
      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        if (authData.success && authData.data?.access_token) {
          accessToken = authData.data.access_token
          console.log("✅ [SuperPayBR Status] Token de autenticação obtido via API")
        } else {
          console.log("⚠️ [SuperPayBR Status] Falha na autenticação via API, usando token direto")
        }
      } else {
        console.log("⚠️ [SuperPayBR Status] Erro na autenticação via API, usando token direto")
      }
    } catch (authError) {
      console.log("⚠️ [SuperPayBR Status] Erro ao obter token via API:", authError)
      console.log("🔄 [SuperPayBR Status] Continuando com token direto...")
    }

    // 4. Consultar status na API SuperPayBR
    const apiUrl = externalId
      ? `${SUPERPAYBR_API_URL}/v1/invoices/external/${externalId}`
      : `${SUPERPAYBR_API_URL}/v1/invoices/${invoiceId}`

    console.log("📡 [SuperPayBR Status] Consultando API:", apiUrl)

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Secret-Key": SUPERPAYBR_SECRET_KEY,
          "Content-Type": "application/json",
          "User-Agent": "SHEIN-Card-System/1.0",
        },
        timeout: 10000, // 10 segundos de timeout
      })

      console.log("📡 [SuperPayBR Status] Resposta da API:")
      console.log("- Status:", response.status)
      console.log("- Status Text:", response.statusText)

      if (response.ok) {
        const apiData = await response.json()
        console.log("📡 [SuperPayBR Status] Dados recebidos:", JSON.stringify(apiData, null, 2))

        if (apiData.success && apiData.data) {
          const invoice = apiData.data
          const statusCode = invoice.status?.code || 1

          // Mapear status SuperPayBR
          const statusMap: Record<
            number,
            {
              name: string
              isPaid: boolean
              isDenied: boolean
              isExpired: boolean
              isCanceled: boolean
              isRefunded: boolean
            }
          > = {
            1: {
              name: "Aguardando Pagamento",
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: false,
              isRefunded: false,
            },
            2: {
              name: "Em Processamento",
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: false,
              isRefunded: false,
            },
            3: {
              name: "Pagamento Agendado",
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: false,
              isRefunded: false,
            },
            4: {
              name: "Autorizado",
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: false,
              isRefunded: false,
            },
            5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
            6: {
              name: "Cancelado",
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: true,
              isRefunded: false,
            },
            8: {
              name: "Parcialmente Estornado",
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: false,
              isRefunded: true,
            },
            9: {
              name: "Estornado",
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: false,
              isRefunded: true,
            },
            12: {
              name: "Pagamento Negado",
              isPaid: false,
              isDenied: true,
              isExpired: false,
              isCanceled: false,
              isRefunded: false,
            },
            15: {
              name: "Pagamento Vencido",
              isPaid: false,
              isDenied: false,
              isExpired: true,
              isCanceled: false,
              isRefunded: false,
            },
            16: {
              name: "Erro no Pagamento",
              isPaid: false,
              isDenied: true,
              isExpired: false,
              isCanceled: false,
              isRefunded: false,
            },
          }

          const statusInfo = statusMap[statusCode] || statusMap[1]

          const paymentData = {
            externalId: invoice.external_id || externalId,
            invoiceId: invoice.id || invoiceId,
            amount: (invoice.amount || 0) / 100,
            statusCode,
            statusName: statusInfo.name,
            isPaid: statusInfo.isPaid,
            isDenied: statusInfo.isDenied,
            isExpired: statusInfo.isExpired,
            isCanceled: statusInfo.isCanceled,
            isRefunded: statusInfo.isRefunded,
            paymentDate: invoice.paid_at || (statusInfo.isPaid ? new Date().toISOString() : null),
            timestamp: new Date().toISOString(),
          }

          console.log("📊 [SuperPayBR Status] Status processado:", paymentData)

          // Se o pagamento foi confirmado, salvar no localStorage simulado
          if (statusInfo.isPaid && externalId) {
            try {
              const localStorageKey = `webhook_payment_${externalId}`
              global.webhookLocalStorage = global.webhookLocalStorage || new Map()
              global.webhookLocalStorage.set(localStorageKey, JSON.stringify(paymentData))
              console.log("💾 [SuperPayBR Status] Status PAGO salvo no localStorage simulado")
            } catch (saveError) {
              console.log("⚠️ [SuperPayBR Status] Erro ao salvar no localStorage:", saveError)
            }
          }

          return NextResponse.json({
            success: true,
            data: paymentData,
            source: "api_superpaybr",
            timestamp: new Date().toISOString(),
          })
        } else {
          console.log("❌ [SuperPayBR Status] Resposta da API sem dados válidos:", apiData)

          return NextResponse.json({
            success: false,
            error: "Resposta da API sem dados válidos",
            data: {
              isPaid: false,
              isDenied: false,
              isExpired: false,
              isCanceled: false,
              isRefunded: false,
              statusCode: 1,
              statusName: "Dados inválidos",
            },
            source: "api_invalid_data",
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        const errorText = await response.text()
        console.log("❌ [SuperPayBR Status] Erro na API:", response.status, errorText)

        return NextResponse.json({
          success: false,
          error: `Erro na API SuperPayBR: ${response.status}`,
          message: errorText,
          data: {
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: false,
            statusCode: 1,
            statusName: `Erro ${response.status}`,
          },
          source: "api_error",
          timestamp: new Date().toISOString(),
        })
      }
    } catch (fetchError) {
      console.log("❌ [SuperPayBR Status] Erro na requisição:", fetchError)

      return NextResponse.json({
        success: false,
        error: "Erro na requisição para SuperPayBR",
        message: fetchError instanceof Error ? fetchError.message : "Erro desconhecido",
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: 1,
          statusName: "Erro de conexão",
        },
        source: "connection_error",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Status] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: 1,
          statusName: "Erro interno",
        },
        source: "server_error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
