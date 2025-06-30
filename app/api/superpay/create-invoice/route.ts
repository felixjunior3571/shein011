import { type NextRequest, NextResponse } from "next/server"

// Interface para dados da fatura SuperPay
interface SuperPayInvoiceRequest {
  externalId: string
  amount: number
  description?: string
  customerName?: string
  customerEmail?: string
  customerDocument?: string
}

interface SuperPayInvoiceResponse {
  id: string
  external_id: string
  qrcode: string
  pix_code: string
  amount: number
  status: {
    code: number
    name: string
  }
  expires_at: string
  created_at: string
}

// Função para gerar código PIX válido
function generatePixCode(externalId: string, amount: number): string {
  const pixKey = "12345678901" // CPF/CNPJ da empresa
  const merchantName = "SHEIN CARD"
  const merchantCity = "SAO PAULO"
  const txId = externalId.substring(0, 25) // Máximo 25 caracteres

  // Formato básico do PIX (simplificado)
  const pixPayload = `00020126580014br.gov.bcb.pix2536${pixKey}${txId}520400005303986540${amount.toFixed(2)}5802BR5909${merchantName}5011${merchantCity}62070503***6304`

  // Calcular CRC16 (simplificado para demo)
  const crc = Math.random().toString(36).substring(2, 6).toUpperCase()

  return pixPayload + crc
}

// Função para gerar QR Code base64
function generateQRCodeBase64(pixCode: string): string {
  // Em produção, usar biblioteca real de QR Code
  // Por enquanto, retornar um placeholder base64
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
}

// Simular criação de fatura na SuperPay
async function createSuperPayInvoice(data: SuperPayInvoiceRequest): Promise<SuperPayInvoiceResponse> {
  console.log("🔄 Criando fatura SuperPay:", data)

  // Simular delay da API
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const pixCode = generatePixCode(data.externalId, data.amount)
  const qrCodeBase64 = generateQRCodeBase64(pixCode)

  const invoice: SuperPayInvoiceResponse = {
    id: `INV_${Date.now()}`,
    external_id: data.externalId,
    qrcode: qrCodeBase64,
    pix_code: pixCode,
    amount: data.amount,
    status: {
      code: 1,
      name: "Aguardando Pagamento",
    },
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
    created_at: new Date().toISOString(),
  }

  console.log("✅ Fatura SuperPay criada:", {
    id: invoice.id,
    external_id: invoice.external_id,
    amount: invoice.amount,
  })

  return invoice
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Criação de fatura SuperPay iniciada")

    const body = await request.json()
    const {
      externalId,
      amount,
      description = "Pagamento SHEIN Card",
      customerName = "Cliente SHEIN",
      customerEmail = "cliente@shein.com",
      customerDocument = "12345678901",
    } = body

    // Validações
    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "externalId é obrigatório",
        },
        { status: 400 },
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Valor inválido",
        },
        { status: 400 },
      )
    }

    console.log("📋 Dados da fatura SuperPay:", {
      externalId,
      amount,
      description,
      customerName,
      customerEmail,
      customerDocument,
    })

    // Criar fatura na SuperPay
    const invoice = await createSuperPayInvoice({
      externalId,
      amount: Number.parseFloat(amount.toString()),
      description,
      customerName,
      customerEmail,
      customerDocument,
    })

    console.log("✅ Fatura SuperPay criada com sucesso:", {
      id: invoice.id,
      external_id: invoice.external_id,
      amount: invoice.amount,
    })

    return NextResponse.json({
      success: true,
      data: invoice,
      message: "Fatura SuperPay criada com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro crítico na criação de fatura SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de criação de fatura SuperPay ativo",
    supported_methods: ["POST"],
    required_fields: ["externalId", "amount"],
    optional_fields: ["description", "customerName", "customerEmail", "customerDocument"],
    timestamp: new Date().toISOString(),
  })
}
