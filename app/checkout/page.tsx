"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { useSuperpayPaymentMonitor } from "@/hooks/use-superpay-payment-monitor"
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

export default function SuperPayCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(7200) // 2 horas
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [externalId, setExternalId] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(0)

  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Obter parâmetros da URL
  const amount = searchParams.get("amount") || "27.97"
  const shipping = searchParams.get("shipping") || "sedex"
  const method = searchParams.get("method") || "SEDEX"

  // Optimized tracking
  const { track, trackPageView, trackConversion } = useOptimizedTracking({
    enableDebug: process.env.NODE_ENV === "development",
  })

  // SuperPay payment monitoring com rate limiting inteligente
  const {
    paymentData,
    isWaitingForPayment,
    error: monitorError,
    lastCheck,
    checksCount,
    currentInterval,
    rateLimitLevel,
    isPaid,
    isDenied,
    isExpired,
    isCanceled,
    isRefunded,
    checkNow,
  } = useSuperpayPaymentMonitor({
    externalId,
    enableDebug: process.env.NODE_ENV === "development",
    onPaymentConfirmed: (data) => {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
      console.log("Dados do pagamento:", data)

      // Track conversion
      trackConversion("payment_confirmed", data.amount || 0)

      // Salvar confirmação no localStorage
      localStorage.setItem("paymentConfirmed", "true")
      localStorage.setItem("paymentAmount", (data.amount || 0).toFixed(2))
      localStorage.setItem("paymentDate", data.payment_date || new Date().toISOString())
      localStorage.setItem("paymentExternalId", data.external_id)
      localStorage.setItem("paymentInvoiceId", data.invoice_id || "")

      // Mostrar estado de redirecionamento com countdown
      setRedirecting(true)
      setRedirectCountdown(3)

      // Countdown de redirecionamento
      let countdown = 3
      redirectTimerRef.current = setInterval(() => {
        countdown--
        setRedirectCountdown(countdown)

        if (countdown <= 0) {
          if (redirectTimerRef.current) {
            clearInterval(redirectTimerRef.current)
          }
          console.log("🚀 Redirecionando para página de ativação...")
          window.location.href = "/upp/001"
        }
      }, 1000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
      track("payment_denied", { amount: data.amount, reason: data.status_title })
      setError(`Pagamento negado: ${data.status_title}`)
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
      track("payment_expired", { amount: data.amount })
      setError("Pagamento vencido. Gere um novo PIX.")
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
      track("payment_canceled", { amount: data.amount })
      setError("Pagamento cancelado.")
    },
    onPaymentRefunded: (data) => {
      console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
      track("payment_refunded", { amount: data.amount })
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
    if (timeLeft > 0 && invoice && !isPaid && !redirecting) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0 && !isPaid) {
      setError("Tempo expirado. Gere um novo PIX.")
      track("payment_timeout", { amount: Number.parseFloat(amount) })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, invoice, isPaid, redirecting, track, amount])

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    createInvoice()
  }, [])

  // Carregar external_id quando a fatura for criada
  useEffect(() => {
    if (invoice) {
      console.log("🔍 Dados da fatura SuperPay recebida:", invoice)

      let capturedExternalId = null

      if (invoice.external_id) {
        capturedExternalId = invoice.external_id
        console.log("✅ External ID encontrado na fatura SuperPay:", capturedExternalId)
      } else {
        capturedExternalId = invoice.id
        console.log("⚠️ External ID não encontrado, usando invoice.id:", capturedExternalId)
      }

      if (capturedExternalId) {
        localStorage.setItem("currentExternalId", capturedExternalId)
        setExternalId(capturedExternalId)
        console.log("💾 External ID SuperPay salvo:", capturedExternalId)

        // Track PIX generation
        track("pix_generated", {
          external_id: capturedExternalId,
          amount: Number.parseFloat(amount),
          type: invoice.type,
        })
      } else {
        console.error("❌ Não foi possível obter external_id SuperPay!")
      }
    }
  }, [invoice, track, amount])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current)
    }
  }, [])

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX SuperPay...")
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

      console.log("📋 Dados do usuário SuperPay:", {
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
        localStorage.setItem("superPayInvoice", JSON.stringify(data.data))

        if (data.data.external_id) {
          localStorage.setItem("currentExternalId", data.data.external_id)
        }

        console.log(
          `✅ Fatura SuperPay criada: ${data.data.type} - Valor: R$ ${(data.data.valores.bruto / 100).toFixed(2)}`,
        )
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)

        // Track successful invoice creation
        track("invoice_created", {
          external_id: data.data.external_id,
          amount: data.data.valores.bruto / 100,
          type: data.data.type,
          customer_name: cpfData.nome,
        })
      } else {
        throw new Error(data.error || "Erro ao criar fatura SuperPay")
      }
    } catch (error) {
      console.log("❌ Erro ao criar fatura SuperPay:", error)
      setError("Erro ao gerar PIX SuperPay. Tente novamente.")

      // Track error
      track("invoice_creation_error", {
        error: error instanceof Error ? error.message : "Unknown error",
        amount: Number.parseFloat(amount),
      })

      createEmergencyPix()
    } finally {
      setLoading(false)
    }
  }

  const createEmergencyPix = () => {
    console.log("🚨 Criando PIX de emergência SuperPay...")

    const totalAmount = Number.parseFloat(amount)
    const emergencyExternalId = `EMERGENCY_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io/qr/v2/${emergencyExternalId}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice: InvoiceData = {
      id: emergencyExternalId,
      invoice_id: `EMERGENCY_${Date.now()}`,
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
    console.log(`✅ PIX de emergência SuperPay criado - Valor: R$ ${totalAmount.toFixed(2)}`)

    // Track emergency PIX creation
    track("emergency_pix_created", {
      amount: totalAmount,
      external_id: emergencyExternalId,
      invoice_id: emergencyInvoice.id,
    })
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

  const handleManualCheck = async () => {
    console.log("🔄 Verificação manual solicitada")
    track("manual_check_requested", { external_id: externalId })
    await checkNow()
  }

  // Função para simular pagamento (apenas para testes)
  const simulatePayment = async () => {
    if (!externalId) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento SuperPay para:", externalId)

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          status_code: 5, // Pago
          amount: Number.parseFloat(amount),
        }),
      })

      const data = await response.json()

      if (data.success) {
        console.log("✅ Pagamento SuperPay simulado com sucesso!")
        track("payment_simulated", { external_id: externalId, amount: Number.parseFloat(amount) })

        // Forçar verificação imediata após simulação
        setTimeout(() => {
          handleManualCheck()
        }, 1000)
      } else {
        console.error("❌ Erro na simulação SuperPay:", data.error)
      }
    } catch (error) {
      console.error("❌ Erro na simulação SuperPay:", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Gerando PIX SuperPay...</h2>
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos seu pagamento</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(amount).toFixed(2)}</p>
              <p>Método: {method}</p>
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

          {/* Status de Redirecionamento */}
          {redirecting && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-bold text-green-800">✅ Pagamento Confirmado!</span>
              </div>
              <div className="text-center">
                <p className="text-green-700 text-sm mb-2">
                  Redirecionando para ativação do cartão em {redirectCountdown} segundos...
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                  <span className="text-green-600 font-mono text-lg">{redirectCountdown}</span>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem de Atenção */}
          {!redirecting && (
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
                      até <strong>2 horas</strong>. Após esse prazo, a sua solicitação será automaticamente cancelada,
                      sem custos adicionais.
                    </p>
                    <p>
                      Ao confirmar o pagamento do frete, você garante todos os benefícios exclusivos:{" "}
                      <strong>cashback, parcelamento sem juros e uso imediato do cartão</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timer */}
          {!redirecting && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-yellow-800">Tempo restante: {formatTime(timeLeft)}</span>
              </div>
            </div>
          )}

          {/* Status do Monitoramento */}
          {!redirecting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {isWaitingForPayment && <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full"></div>}
                  <p className="text-blue-800 font-medium">
                    {isPaid
                      ? "✅ Pagamento Confirmado!"
                      : isDenied
                        ? "❌ Pagamento Negado"
                        : isExpired
                          ? "⏰ Pagamento Vencido"
                          : isCanceled
                            ? "🚫 Pagamento Cancelado"
                            : isRefunded
                              ? "🔄 Pagamento Estornado"
                              : isWaitingForPayment
                                ? "⏳ Aguardando confirmação..."
                                : "🔍 Verificando pagamento..."}
                  </p>
                </div>

                <div className="text-blue-600 text-sm space-y-1">
                  <p>External ID: {externalId || "Carregando..."}</p>
                  <p>
                    Verificações: {checksCount} | Intervalo: {Math.round(currentInterval / 1000)}s | Nível:{" "}
                    {rateLimitLevel + 1}
                  </p>
                  {lastCheck && <p>Última verificação: {lastCheck.toLocaleTimeString()}</p>}
                  {paymentData && <p>Status atual: {paymentData.status_title}</p>}
                </div>

                {/* Botão de verificação manual */}
                <button
                  onClick={handleManualCheck}
                  disabled={isWaitingForPayment}
                  className="mt-3 flex items-center justify-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isWaitingForPayment ? "animate-spin" : ""}`} />
                  <span>Verificar Agora</span>
                </button>
              </div>
            </div>
          )}

          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-green-600">R$ {Number.parseFloat(amount).toFixed(2)}</p>
            <p className="text-sm text-gray-500">Frete {method} - Cartão SHEIN</p>
          </div>

          {/* QR Code */}
          {!redirecting && (
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                {invoice && <SmartQRCode invoice={invoice} width={200} height={200} className="mx-auto" />}
              </div>
              <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
            </div>
          )}

          {/* Código PIX */}
          {!redirecting && (
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
          )}

          {/* Instruções */}
          {!redirecting && (
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
                <span>Aguarde a confirmação automática via webhook SuperPay</span>
              </div>
            </div>
          )}

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && !redirecting && (
            <button
              onClick={simulatePayment}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO APROVADO (TESTE)
            </button>
          )}

          {/* Erro de monitoramento */}
          {monitorError && !redirecting && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                <strong>Erro de monitoramento:</strong> {monitorError}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
