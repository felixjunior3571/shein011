"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { usePureWebhookMonitor } from "@/hooks/use-pure-webhook-monitor"
import { useOptimizedTracking } from "@/hooks/use-optimized-tracking"

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

export default function PureWebhookCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [externalId, setExternalId] = useState<string | null>(null)

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

  // PURE webhook monitoring (NO API CALLS!)
  const {
    status: paymentStatus,
    isWaitingForWebhook,
    error: webhookError,
    lastWebhookCheck,
  } = usePureWebhookMonitor({
    externalId,
    enableDebug: process.env.NODE_ENV === "development",
    onPaymentConfirmed: (data) => {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK PURO!")

      // Track conversion
      trackConversion("payment_confirmed", data.amount)

      // Salvar confirmação
      localStorage.setItem("paymentConfirmed", "true")
      localStorage.setItem("paymentAmount", data.amount.toFixed(2))
      localStorage.setItem("paymentDate", data.paymentDate || new Date().toISOString())

      // Redirecionar após 2 segundos
      setTimeout(() => {
        console.log("🚀 Redirecionando para página de ativação...")
        window.location.href = "/upp/001"
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK PURO!")
      track("payment_denied", { amount: data.amount, reason: data.statusName })
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK PURO!")
      track("payment_expired", { amount: data.amount })
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

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    createInvoice()
  }, [])

  // Carregar external_id quando a fatura for criada
  useEffect(() => {
    if (invoice) {
      console.log("🔍 Dados da fatura recebida:", invoice)

      let capturedExternalId = null

      if (invoice.external_id) {
        capturedExternalId = invoice.external_id
        console.log("✅ External ID encontrado na fatura:", capturedExternalId)
      } else {
        capturedExternalId = invoice.id
        console.log("⚠️ External ID não encontrado, usando invoice.id:", capturedExternalId)
      }

      if (capturedExternalId) {
        localStorage.setItem("currentExternalId", capturedExternalId)
        setExternalId(capturedExternalId)
        console.log("💾 External ID salvo:", capturedExternalId)

        // Track PIX generation
        track("pix_generated", {
          external_id: capturedExternalId,
          amount: Number.parseFloat(amount),
          type: invoice.type,
        })
      } else {
        console.error("❌ Não foi possível obter external_id!")
      }
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

      const response = await fetch("/api/tryplopay/create-invoice", {
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
        localStorage.setItem("tryploPayInvoice", JSON.stringify(data.data))
        localStorage.setItem("currentExternalId", data.data.external_id)

        console.log(`✅ Fatura criada: ${data.data.type} - Valor: R$ ${(data.data.valores.bruto / 100).toFixed(2)}`)
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)

        // Track successful invoice creation
        track("invoice_created", {
          external_id: data.data.external_id,
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

      createEmergencyPix()
    } finally {
      setLoading(false)
    }
  }

  const createEmergencyPix = () => {
    console.log("🚨 Criando PIX de emergência...")

    const totalAmount = Number.parseFloat(amount)
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.pix.com/qr/v2/EMERGENCY${Date.now()}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice: InvoiceData = {
      id: `EMG_${Date.now()}`,
      invoice_id: `EMERGENCY_${Date.now()}`,
      pix: {
        payload: emergencyPix,
        image: "/placeholder.svg?height=250&width=250",
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}`,
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
    console.log(`✅ PIX de emergência criado - Valor: R$ ${totalAmount.toFixed(2)}`)

    // Track emergency PIX creation
    track("emergency_pix_created", {
      amount: totalAmount,
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
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
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

      const response = await fetch("/api/tryplopay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId,
          amount: Number.parseFloat(amount),
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Pagamento simulado com sucesso!")
        track("payment_simulated", { external_id: externalId, amount: Number.parseFloat(amount) })
      } else {
        console.error("❌ Erro ao simular pagamento:", result.error)
      }
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

          {/* Status em Tempo Real - PURE WEBHOOK */}
          <div
            className={`border-2 rounded-lg p-4 mb-6 ${
              paymentStatus?.isPaid
                ? "bg-green-100 text-green-800 border-green-300"
                : paymentStatus?.isDenied
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-blue-100 text-blue-800 border-blue-300"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  paymentStatus?.isPaid
                    ? "bg-green-500"
                    : isWaitingForWebhook
                      ? "animate-pulse bg-blue-500"
                      : "bg-gray-400"
                }`}
              ></div>
              <span className="font-bold">
                {paymentStatus?.isPaid
                  ? "✅ Pagamento Confirmado!"
                  : paymentStatus?.isDenied
                    ? "❌ Pagamento Negado"
                    : "⏳ Aguardando Webhook..."}
              </span>
            </div>
            {externalId && <p className="text-xs mt-2 text-center opacity-75">ID: {externalId}</p>}
            {lastWebhookCheck && (
              <p className="text-xs mt-1 text-center opacity-60">
                Última verificação: {lastWebhookCheck.toLocaleTimeString()}
              </p>
            )}
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
                  copied ? "bg-green-500 text-white" : "bg-black text-white hover:bg-black/90"
                }`}
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
          </div>

          {/* Status PURE Webhook */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${isWaitingForWebhook ? "animate-pulse bg-green-500" : "bg-green-400"}`}
              ></div>
              <span className="text-green-800 font-medium">
                {isWaitingForWebhook ? "Aguardando notificação automática..." : "Sistema webhook ativo"}
              </span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              ✅ ZERO API calls! Confirmação instantânea via webhook
              {webhookError && <span className="text-red-600"> - Erro: {webhookError}</span>}
            </p>
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

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && (
            <button
              onClick={simulatePayment}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO APROVADO (TESTE)
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
