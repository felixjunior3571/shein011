"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle, RefreshCw, RotateCcw } from "lucide-react"
import { useDefinitivePaymentMonitor } from "@/hooks/use-definitive-payment-monitor"
import { useOptimizedTracking } from "@/hooks/use-optimized-tracking"
import { SmartQRCode } from "@/components/smart-qr-code"

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

export default function DefinitiveCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(7200) // 2 horas
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [externalId, setExternalId] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Obter parâmetros da URL
  const amount = searchParams.get("amount") || "27.97"
  const shipping = searchParams.get("shipping") || "pac"
  const method = searchParams.get("method") || "PAC"

  // Optimized tracking
  const { track, trackPageView, trackConversion } = useOptimizedTracking({
    enableDebug: process.env.NODE_ENV === "development",
  })

  // Monitoramento definitivo de pagamento
  const {
    status: paymentStatus,
    isMonitoring,
    error: monitorError,
    lastCheck,
    paymentData,
    retryCount,
    checkCount,
    maxRetries,
    forceCheck,
    resetMonitoring,
  } = useDefinitivePaymentMonitor({
    externalId,
    invoiceId,
    enableDebug: process.env.NODE_ENV === "development",
    checkInterval: 3000, // 3 segundos
    maxRetries: 240, // 240 tentativas = 12 minutos
    onPaymentConfirmed: (data) => {
      console.log("🎉 PAGAMENTO CONFIRMADO DEFINITIVAMENTE!")
      console.log("💰 Dados do pagamento:", data)

      setIsRedirecting(true)

      // Track conversion
      trackConversion("payment_confirmed", data.amount)

      // Salvar confirmação
      localStorage.setItem("paymentConfirmed", "true")
      localStorage.setItem("paymentAmount", data.amount.toFixed(2))
      localStorage.setItem("paymentDate", data.paymentDate || new Date().toISOString())
      localStorage.setItem("paymentGateway", "superpaybr")
      localStorage.setItem("paymentSource", data.source || "unknown")

      // Redirecionar após 2 segundos
      setTimeout(() => {
        console.log("🚀 Redirecionando para página de ativação...")
        router.push("/upp/001")
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO!")
      track("payment_denied", { amount: data.amount, reason: data.statusName, source: data.source })
      setError(`Pagamento negado: ${data.statusName}`)
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO!")
      track("payment_expired", { amount: data.amount, source: data.source })
      setError("Pagamento vencido. Gere um novo PIX.")
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 PAGAMENTO CANCELADO!")
      track("payment_canceled", { amount: data.amount, source: data.source })
      setError("Pagamento cancelado.")
    },
    onPaymentRefunded: (data) => {
      console.log("🔄 PAGAMENTO ESTORNADO!")
      track("payment_refunded", { amount: data.amount, source: data.source })
      setError("Pagamento estornado.")
    },
  })

  // Track page view on mount
  useEffect(() => {
    trackPageView("/checkout")
    track("checkout_page_loaded", {
      amount: Number.parseFloat(amount),
      shipping_method: method,
    })
  }, [trackPageView, track, amount, method])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && invoice && paymentStatus !== "confirmed" && !isRedirecting) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setError("Tempo expirado. Gere um novo PIX.")
      track("payment_timeout", { amount: Number.parseFloat(amount) })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, invoice, paymentStatus, isRedirecting, track, amount])

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    createInvoice()
  }, [])

  // Carregar IDs quando a fatura for criada
  useEffect(() => {
    if (invoice) {
      console.log("🔍 Dados da fatura recebida:", invoice)

      const capturedExternalId = invoice.external_id || invoice.id
      const capturedInvoiceId = invoice.invoice_id || invoice.id

      if (capturedExternalId) {
        localStorage.setItem("currentExternalId", capturedExternalId)
        setExternalId(capturedExternalId)
        console.log("💾 External ID salvo:", capturedExternalId)
      }

      if (capturedInvoiceId) {
        localStorage.setItem("currentInvoiceId", capturedInvoiceId)
        setInvoiceId(capturedInvoiceId)
        console.log("💾 Invoice ID salvo:", capturedInvoiceId)
      }

      // Track PIX generation
      track("pix_generated", {
        external_id: capturedExternalId,
        invoice_id: capturedInvoiceId,
        amount: Number.parseFloat(amount),
        type: invoice.type,
      })
    }
  }, [invoice, track, amount])

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX...")
      console.log("Parâmetros:", { amount: Number.parseFloat(amount), shipping, method })

      // Track invoice creation start
      track("invoice_creation_started", {
        amount: Number.parseFloat(amount),
        shipping_method: method,
      })

      // Carregar dados do usuário do localStorage
      const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
      const userEmail = localStorage.getItem("userEmail") || ""
      const userWhatsApp = localStorage.getItem("userWhatsApp") || ""
      const deliveryAddress = JSON.parse(localStorage.getItem("deliveryAddress") || "{}")

      console.log("📋 Dados do usuário:", {
        nome: cpfData.nome,
        email: userEmail,
        whatsapp: userWhatsApp,
        endereco: deliveryAddress,
      })

      const response = await fetch("/api/superpaybr/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cpf-data": JSON.stringify(cpfData),
          "x-user-email": userEmail,
          "x-user-whatsapp": userWhatsApp,
          "x-delivery-address": JSON.stringify(deliveryAddress),
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          shipping,
          method,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setInvoice(data.data)
        localStorage.setItem("currentInvoice", JSON.stringify(data.data))

        console.log(`✅ Fatura criada: ${data.data.type} - Valor: R$ ${(data.data.valores.bruto / 100).toFixed(2)}`)
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)

        // Track successful invoice creation
        track("invoice_created", {
          external_id: data.data.external_id,
          invoice_id: data.data.invoice_id,
          amount: data.data.valores.bruto / 100,
          type: data.data.type,
          customer_name: cpfData.nome,
        })
      } else {
        throw new Error(data.error || "Erro ao criar fatura")
      }
    } catch (error) {
      console.log("❌ Erro ao criar fatura:", error)
      setError("Erro ao gerar PIX. Tente novamente.")

      // Track error
      track("invoice_creation_error", {
        error: error instanceof Error ? error.message : "Unknown error",
        amount: Number.parseFloat(amount),
      })
    } finally {
      setLoading(false)
    }
  }

  const copyPixCode = async () => {
    if (!invoice) return

    try {
      await navigator.clipboard.writeText(invoice.pix.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // Track PIX code copy
      track("pix_code_copied", {
        external_id: externalId,
        invoice_id: invoiceId,
        amount: Number.parseFloat(amount),
      })
    } catch (error) {
      console.log("❌ Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Função para simular pagamento (apenas para testes)
  const simulatePayment = async () => {
    if (!externalId) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento para:", externalId)

      // Simular webhook data diretamente no localStorage
      const simulatedWebhookData = {
        isPaid: true,
        isDenied: false,
        isRefunded: false,
        isExpired: false,
        isCanceled: false,
        statusCode: 5,
        statusName: "Pagamento Confirmado (Simulado)",
        amount: Number.parseFloat(amount),
        paymentDate: new Date().toISOString(),
        externalId: externalId,
        invoiceId: invoiceId,
        source: "simulation",
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem(`webhook_payment_${externalId}`, JSON.stringify(simulatedWebhookData))
      console.log("✅ Pagamento simulado com sucesso!")
      track("payment_simulated", { external_id: externalId, amount: Number.parseFloat(amount) })

      // Forçar nova verificação
      forceCheck()
    } catch (error) {
      console.error("❌ Erro na simulação:", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Gerando PIX...</h2>
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos seu pagamento</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(amount).toFixed(2)}</p>
              <p>Método: {method}</p>
              <p>Sistema: Monitoramento Definitivo</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error && !invoice) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-red-600">Erro no Pagamento</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={createInvoice}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-black/90 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pagamento PIX</h1>
          </div>

          {/* Success Message */}
          {(paymentStatus === "confirmed" || isRedirecting) && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">✅ Pagamento Confirmado!</span>
                {isRedirecting && <RefreshCw className="w-4 h-4 animate-spin" />}
              </div>
              <p className="text-green-700 text-sm mt-2 text-center">
                {isRedirecting ? "Redirecionando para ativação do cartão..." : "Processando confirmação..."}
              </p>
              {paymentData && (
                <div className="text-green-600 text-xs mt-2 text-center space-y-1">
                  <p>Fonte: {paymentData.source}</p>
                  <p>Status: {paymentData.statusName}</p>
                  <p>Valor: R$ {paymentData.amount.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-800">Erro:</span>
              </div>
              <p className="text-red-700 text-sm mt-1 text-center">{error}</p>
            </div>
          )}

          {monitorError && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-bold text-orange-800">Erro no Monitoramento:</span>
              </div>
              <p className="text-orange-700 text-sm mt-1 text-center">{monitorError}</p>
            </div>
          )}

          {/* Mensagem de Atenção */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-yellow-800 font-bold text-sm mb-2">ATENÇÃO! ⏳</h3>
                <div className="text-yellow-700 text-sm space-y-2">
                  <p>
                    Para garantir o envio do seu <strong>Cartão SHEIN</strong>, este pagamento deve ser confirmado em
                    até <strong>2 horas</strong>. Após esse prazo, a sua solicitação será automaticamente cancelada.
                  </p>
                  <p>
                    Ao confirmar o pagamento do frete, você garante todos os benefícios exclusivos:{" "}
                    <strong>cashback, parcelamento sem juros e uso imediato do cartão</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-yellow-800">Tempo restante: {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-green-600">R$ {Number.parseFloat(amount).toFixed(2)}</p>
            <p className="text-sm text-gray-500">Frete {method} - Cartão SHEIN</p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              {invoice && <SmartQRCode invoice={invoice} width={200} height={200} className="mx-auto" />}
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
                  copied ? "bg-green-500 text-white" : "bg-black text-white hover:bg-black/90"
                }`}
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
          </div>

          {/* Status do Monitoramento Definitivo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-blue-800">Monitoramento Definitivo:</p>
                <p className="text-xs text-blue-600">
                  {isMonitoring ? "🔄 Monitorando ativamente..." : "⏸️ Monitoramento pausado"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600">Status: {paymentStatus}</p>
                <p className="text-xs text-blue-500">Verificação #{checkCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
              <div>
                <p>Última verificação:</p>
                <p className="font-mono">{lastCheck ? lastCheck.toLocaleTimeString() : "N/A"}</p>
              </div>
              <div>
                <p>
                  Tentativas: {retryCount}/{maxRetries}
                </p>
                <p>Fonte: {paymentData?.source || "N/A"}</p>
              </div>
            </div>

            {/* Botões de controle */}
            <div className="flex space-x-2 mt-3">
              <button
                onClick={forceCheck}
                disabled={isMonitoring}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                🔄 Verificar Agora
              </button>
              <button
                onClick={resetMonitoring}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                Reset
              </button>
            </div>
          </div>

          {/* Instruções */}
          <div className="space-y-3 text-sm text-gray-600 mb-6">
            <div className="flex items-start space-x-2">
              <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </span>
              <span>Abra o app do seu banco</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </span>
              <span>Escaneie o QR Code ou cole o código PIX</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </span>
              <span>Confirme o pagamento</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                4
              </span>
              <span>Aguarde a confirmação automática (webhook + polling)</span>
            </div>
          </div>

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && (
            <button
              onClick={simulatePayment}
              disabled={paymentStatus === "confirmed" || isRedirecting}
              className="w-full mb-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO APROVADO (TESTE)
            </button>
          )}

          {/* Debug Info (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && (
            <div className="p-3 bg-gray-100 rounded-lg text-xs space-y-1">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>External ID: {externalId || "N/A"}</p>
              <p>Invoice ID: {invoiceId || "N/A"}</p>
              <p>Status: {paymentStatus}</p>
              <p>Monitorando: {isMonitoring ? "Sim" : "Não"}</p>
              <p>Verificações: {checkCount}</p>
              <p>
                Tentativas: {retryCount}/{maxRetries}
              </p>
              <p>Dados: {paymentData ? "Encontrados" : "Não encontrados"}</p>
              {paymentData && <p>Fonte: {paymentData.source}</p>}
              {monitorError && <p className="text-red-600">Erro: {monitorError}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
