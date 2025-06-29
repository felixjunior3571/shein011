import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get("invoiceId")

  console.log("=== DEBUG QR CODE SUPERPAYBR ===")
  console.log("Invoice ID recebido:", invoiceId)

  const debugInfo = {
    timestamp: new Date().toISOString(),
    invoiceId,
    tests: [] as any[],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
  }

  // Teste 1: Verificar se Invoice ID foi fornecido
  const test1 = {
    name: "Invoice ID fornecido",
    passed: !!invoiceId,
    details: invoiceId ? `ID: ${invoiceId}` : "Invoice ID não fornecido",
  }
  debugInfo.tests.push(test1)

  if (!invoiceId) {
    debugInfo.summary.total = 1
    debugInfo.summary.failed = 1
    return NextResponse.json(debugInfo)
  }

  // Teste 2: Verificar conectividade com SuperPayBR
  try {
    const testUrl = `https://api.superpaybr.com/v4/invoices/qrcode/${invoiceId}`
    console.log("🔗 Testando URL:", testUrl)

    const startTime = Date.now()
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SHEIN-Card-Debug/1.0",
      },
    })
    const endTime = Date.now()
    const responseTime = endTime - startTime

    const test2 = {
      name: "Conectividade SuperPayBR API",
      passed: response.ok,
      details: {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      },
    }
    debugInfo.tests.push(test2)

    // Teste 3: Analisar resposta da API
    let responseData = null
    try {
      responseData = await response.json()

      const test3 = {
        name: "Parsing da resposta JSON",
        passed: true,
        details: {
          hasData: !!responseData,
          dataType: typeof responseData,
          keys: responseData ? Object.keys(responseData) : [],
          fullResponse: responseData,
        },
      }
      debugInfo.tests.push(test3)

      // Teste 4: Verificar campos essenciais do QR Code
      const qrCodeFields = {
        qr_code: responseData?.qr_code,
        qrcode: responseData?.qrcode,
        image: responseData?.image,
        url: responseData?.url,
        pix_code: responseData?.pix_code,
        payload: responseData?.payload,
      }

      const hasQRCode = Object.values(qrCodeFields).some((field) => !!field)

      const test4 = {
        name: "Campos QR Code presentes",
        passed: hasQRCode,
        details: {
          availableFields: qrCodeFields,
          hasAnyQRField: hasQRCode,
          recommendedField: qrCodeFields.qr_code || qrCodeFields.image || qrCodeFields.url,
        },
      }
      debugInfo.tests.push(test4)

      // Teste 5: Validar URLs de imagem (se existirem)
      const imageUrls = [responseData?.qr_code, responseData?.image, responseData?.url].filter(Boolean)

      for (const imageUrl of imageUrls) {
        try {
          const imageResponse = await fetch(imageUrl, { method: "HEAD" })
          const contentType = imageResponse.headers.get("content-type")

          const test5 = {
            name: `Validação URL imagem: ${imageUrl.substring(0, 50)}...`,
            passed: imageResponse.ok && contentType?.startsWith("image/"),
            details: {
              url: imageUrl,
              status: imageResponse.status,
              contentType,
              isImage: contentType?.startsWith("image/"),
            },
          }
          debugInfo.tests.push(test5)
        } catch (error) {
          const test5 = {
            name: `Validação URL imagem: ${imageUrl.substring(0, 50)}...`,
            passed: false,
            details: {
              url: imageUrl,
              error: error instanceof Error ? error.message : "Erro desconhecido",
            },
          }
          debugInfo.tests.push(test5)
        }
      }
    } catch (jsonError) {
      const test3 = {
        name: "Parsing da resposta JSON",
        passed: false,
        details: {
          error: jsonError instanceof Error ? jsonError.message : "Erro no parsing JSON",
          rawResponse: await response.text().catch(() => "Não foi possível obter texto da resposta"),
        },
      }
      debugInfo.tests.push(test3)
    }
  } catch (networkError) {
    const test2 = {
      name: "Conectividade SuperPayBR API",
      passed: false,
      details: {
        error: networkError instanceof Error ? networkError.message : "Erro de rede desconhecido",
        url: `https://api.superpaybr.com/v4/invoices/qrcode/${invoiceId}`,
      },
    }
    debugInfo.tests.push(test2)
  }

  // Teste 6: Verificar endpoint interno
  try {
    const internalUrl = `/api/superpaybr/get-qrcode?invoiceId=${invoiceId}`
    const internalResponse = await fetch(`${request.nextUrl.origin}${internalUrl}`)
    const internalData = await internalResponse.json()

    const test6 = {
      name: "Endpoint interno get-qrcode",
      passed: internalResponse.ok && internalData.success,
      details: {
        url: internalUrl,
        status: internalResponse.status,
        success: internalData.success,
        data: internalData,
      },
    }
    debugInfo.tests.push(test6)
  } catch (internalError) {
    const test6 = {
      name: "Endpoint interno get-qrcode",
      passed: false,
      details: {
        error: internalError instanceof Error ? internalError.message : "Erro interno",
      },
    }
    debugInfo.tests.push(test6)
  }

  // Calcular resumo
  debugInfo.summary.total = debugInfo.tests.length
  debugInfo.summary.passed = debugInfo.tests.filter((test) => test.passed).length
  debugInfo.summary.failed = debugInfo.tests.filter((test) => !test.passed).length

  console.log("=== RESUMO DEBUG QR CODE ===")
  console.log(`Total de testes: ${debugInfo.summary.total}`)
  console.log(`Passou: ${debugInfo.summary.passed}`)
  console.log(`Falhou: ${debugInfo.summary.failed}`)
  console.log(
    "Testes que falharam:",
    debugInfo.tests.filter((test) => !test.passed).map((test) => test.name),
  )

  return NextResponse.json(debugInfo, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}
