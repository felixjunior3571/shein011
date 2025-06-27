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
  const maxRequests = 3

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
    // Implementar bloqueio progressivo
    const blockTimes = [5 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000] // 5min, 30min, 1h
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

    console.log("[TRYPLOPAY] === DEBUG COMPLETO ===")
    console.log("[TRYPLOPAY] Criando fatura PIX:", { amount, shippingMethod })
    console.log("[TRYPLOPAY] Customer data:", customerData)

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
    const externalId = `shein_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

    // Preparar dados do cliente
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

    debugInfo.step = "preparing_payload"

    // Payload para TryploPay conforme documentação
    const payload = {
      client: clientData,
      payment: {
        product_type: 1,
        id: externalId,
        type: 1, // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: externalId,
        installments: "1",
        webhook: process.env.TRYPLOPAY_WEBHOOK_URL,
        products: [
          {
            id: "1",
            title: `Frete ${shippingMethod} - Cartão SHEIN`,
            qnt: 1,
            amount: amount.toFixed(2),
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    debugInfo.data.tryplopay_payload = payload

    console.log("[TRYPLOPAY] Payload preparado:", JSON.stringify(payload, null, 2))

    debugInfo.step = "checking_env_vars"

    // Verificar variáveis de ambiente
    const envCheck = {
      TRYPLOPAY_TOKEN: !!process.env.TRYPLOPAY_TOKEN,
      TRYPLOPAY_API_URL: !!process.env.TRYPLOPAY_API_URL,
      TRYPLOPAY_WEBHOOK_URL: !!process.env.TRYPLOPAY_WEBHOOK_URL,
      token_length: process.env.TRYPLOPAY_TOKEN?.length || 0,
      api_url: process.env.TRYPLOPAY_API_URL,
      webhook_url: process.env.TRYPLOPAY_WEBHOOK_URL,
    }

    debugInfo.data.env_check = envCheck

    if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_API_URL) {
      debugInfo.errors.push("Variáveis de ambiente não configuradas")
      console.error("[TRYPLOPAY] Variáveis de ambiente não configuradas")
      console.error("[TRYPLOPAY] Env check:", envCheck)

      return NextResponse.json(
        {
          success: false,
          error: "Configuração inválida - variáveis de ambiente não definidas",
          debug: debugInfo,
        },
        { status: 500 },
      )
    }

    debugInfo.step = "preparing_request"

    // Headers de autenticação
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
    }

    const requestUrl = `${process.env.TRYPLOPAY_API_URL}/invoices`

    debugInfo.data.request = {
      url: requestUrl,
      headers: { ...headers, Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN?.substring(0, 10)}...` },
      method: "POST",
    }

    console.log("[TRYPLOPAY] Fazendo request para:", requestUrl)
    console.log("[TRYPLOPAY] Headers:", {
      ...headers,
      Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN?.substring(0, 10)}...`,
    })

    debugInfo.step = "making_api_request"

    // Request para TryploPay
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos

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

      return NextResponse.json(
        {
          success: false,
          error: `Erro de conexão: ${fetchError instanceof Error ? fetchError.message : "Erro desconhecido"}`,
          debug: debugInfo,
        },
        { status: 500 },
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
      debugInfo.data.response_text = responseText.substring(0, 1000) // Primeiros 1000 caracteres
    } catch (textError) {
      debugInfo.errors.push(`Erro ao ler response text: ${textError}`)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao ler resposta da API",
          debug: debugInfo,
        },
        { status: 500 },
      )
    }

    console.log("[TRYPLOPAY] Response body (first 500 chars):", responseText.substring(0, 500))

    debugInfo.step = "validating_response_format"

    // Verificar se retornou HTML (erro)
    if (responseText.startsWith("<!DOCTYPE") || responseText.includes("<html")) {
      debugInfo.errors.push("API retornou HTML ao invés de JSON - possível erro 404/500")
      console.error("[TRYPLOPAY] API retornou HTML ao invés de JSON - possível erro 404/500")

      return NextResponse.json(
        {
          success: false,
          error: "API TryploPay retornou página de erro (HTML)",
          debug: debugInfo,
        },
        { status: 500 },
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

      return NextResponse.json(
        {
          success: false,
          error: "Resposta da API não é um JSON válido",
          debug: debugInfo,
        },
        { status: 500 },
      )
    }

    debugInfo.step = "checking_api_response"

    if (!response.ok) {
      debugInfo.errors.push(
        `API retornou erro ${response.status}: ${data.error || data.message || "Erro desconhecido"}`,
      )
      console.error("[TRYPLOPAY] Erro da API:", data)

      return NextResponse.json(
        {
          success: false,
          error: `TryploPay API error: ${response.status} - ${data.error || data.message || "Erro desconhecido"}`,
          debug: debugInfo,
        },
        { status: 500 },
      )
    }

    debugInfo.step = "processing_success_response"

    // Processar resposta de sucesso
    console.log("[TRYPLOPAY] Fatura criada com sucesso:", data)

    // Extrair dados da resposta (ajustar conforme estrutura real da TryploPay)
    const invoiceData = data.invoice || data.invoices || data
    debugInfo.data.invoice_data = invoiceData

    const pixCode = invoiceData.payment?.details?.pix_code || invoiceData.pix_code || invoiceData.details?.pix_code
    const qrCodeUrl = invoiceData.payment?.details?.qrcode || invoiceData.qrcode || invoiceData.details?.qrcode

    debugInfo.data.extracted_data = {
      pixCode: pixCode ? `${pixCode.substring(0, 50)}...` : null,
      qrCodeUrl,
      invoiceId: invoiceData.id || invoiceData.invoice_id,
      token: invoiceData.token,
    }

    if (!pixCode) {
      debugInfo.errors.push("PIX code não encontrado na resposta da API")
      console.error("[TRYPLOPAY] PIX code não encontrado na resposta")
      console.error("[TRYPLOPAY] Estrutura da resposta:", Object.keys(invoiceData))

      return NextResponse.json(
        {
          success: false,
          error: "PIX code não encontrado na resposta da TryploPay",
          debug: debugInfo,
        },
        { status: 500 },
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
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
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

    console.log("[TRYPLOPAY] PIX real gerado com sucesso:", result)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    debugInfo.step = "error_handler"
    debugInfo.errors.push(`Erro geral: ${error instanceof Error ? error.message : "Erro desconhecido"}`)

    console.error("[TRYPLOPAY] Erro na API:", error)
    console.error("[TRYPLOPAY] Debug info:", debugInfo)

    return NextResponse.json(
      {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        debug: debugInfo,
      },
      { status: 500 },
    )
  }
}
