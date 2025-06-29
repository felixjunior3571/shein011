"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { useSuperPayBRWebhookMonitor } from "@/hooks/use-superpaybr-webhook-monitor"
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

export default function SuperPayBRCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(7200) // 2 horas em segundos
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

  // SuperPayBR webhook monitoring (IDÊNTICO AO SISTEMA TRYPLOPAY)
  const {
    status: paymentStatus,
    isWaitingForWebhook,
    error: webhookError,
    lastCheck: lastWebhookCheck,
    paymentData,
  } = useSuperPayBRWebhookMonitor({
    externalId,
    enableDebug: process.env.NODE_ENV === "development",
    onPaymentConfirmed: (data) => {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")

      // Track conversion
      trackConversion("payment_confirmed", data.amount / 100)

      // Salvar confirmação
      localStorage.setItem("paymentConfirmed", "true")
      localStorage.setItem("paymentAmount", (data.amount / 100).toFixed(2))
      localStorage.setItem("paymentDate", data.paymentDate || new Date().toISOString())
      localStorage.setItem("paymentProvider", "superpaybr")

      // Redirecionar após 2 segundos
      setTimeout(() => {
        console.log("🚀 Redirecionando para página de ativação...")
        window.location.href = "/upp/001"
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
      track("payment_denied", { amount: data.amount / 100, reason: data.statusName, provider: "superpaybr" })
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
      track("payment_expired", { amount: data.amount / 100, provider: "superpaybr" })
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
      track("payment_canceled", { amount: data.amount / 100, provider: "superpaybr" })
    },
    onPaymentRefunded: (data) => {
      console.log("↩️ PAGAMENTO REEMBOLSADO VIA WEBHOOK SUPERPAYBR!")
      track("payment_refunded", { amount: data.amount / 100, provider: "superpaybr" })
    },
  })

  // Track page view on mount
  useEffect(() => {
    trackPageView("/checkout")
    track("checkout_page_loaded", {
      amount: Number.parseFloat(amount),
      shipping_method: method,
      provider: "superpaybr",
    })
  }, [trackPageView, track, amount, method])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && invoice && paymentStatus !== "confirmed") {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setError("Tempo expirado. Gere um novo PIX.")
      track("payment_timeout", { amount: Number.parseFloat(amount), provider: "superpaybr" })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, invoice, paymentStatus, track, amount])

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    createInvoice()
  }, [])

  // Carregar external_id quando a fatura for criada
  useEffect(() => {
    if (invoice) {
      console.log("🔍 Dados da fatura SuperPayBR recebida:", invoice)

      let capturedExternalId = null

      if (invoice.external_id) {
        capturedExternalId = invoice.external_id
        console.log("✅ External ID encontrado na fatura SuperPayBR:", capturedExternalId)
      } else {
        capturedExternalId = invoice.id
        console.log("⚠️ External ID não encontrado, usando invoice.id:", capturedExternalId)
      }

      if (capturedExternalId) {
        localStorage.setItem("currentExternalId", capturedExternalId)
        localStorage.setItem("currentProvider", "superpaybr")
        setExternalId(capturedExternalId)
        console.log("💾 External ID SuperPayBR salvo:", capturedExternalId)

        // Track PIX generation
        track("pix_generated", {
          external_id: capturedExternalId,
          amount: Number.parseFloat(amount),
          type: invoice.type,
          provider: "superpaybr",
        })
      } else {
        console.error("❌ Não foi possível obter external_id SuperPayBR!")
      }
    }
  }, [invoice, track, amount])

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX SuperPayBR...")
      console.log("Parâmetros:", { amount: Number.parseFloat(amount), shipping, method })

      // Track invoice creation start
      track("invoice_creation_started", {
        amount: Number.parseFloat(amount),
        shipping_method: method,
        provider: "superpaybr",
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
        localStorage.setItem("currentExternalId", data.data.external_id)
        localStorage.setItem("currentProvider", "superpaybr")

        console.log(
          `✅ Fatura SuperPayBR criada: ${data.data.type} - Valor: R$ ${(data.data.valores.bruto / 100).toFixed(2)}`,
        )
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)

        // Track successful invoice creation
        track("invoice_created", {
          external_id: data.data.external_id,
          amount: data.data.valores.bruto / 100,
          type: data.data.type,
          customer_name: cpfData.nome,
          provider: "superpaybr",
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
        provider: "superpaybr",
      })

      createEmergencyPix()
    } finally {
      setLoading(false)
    }
  }

  const createEmergencyPix = () => {
    console.log("🚨 Criando PIX de emergência SuperPayBR...")

    const totalAmount = Number.parseFloat(amount)
    const emergencyExternalId = `SHEIN_EMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/${emergencyExternalId}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice: InvoiceData = {
      id: emergencyExternalId,
      invoice_id: emergencyExternalId,
      external_id: emergencyExternalId,
      pix: {
        payload: emergencyPix,
        image: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200`,
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200`,
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
    console.log(`✅ PIX de emergência SuperPayBR criado - Valor: R$ ${totalAmount.toFixed(2)}`)

    // Track emergency PIX creation
    track("emergency_pix_created", {
      amount: totalAmount,
      invoice_id: emergencyInvoice.id,
      provider: "superpaybr",
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
        provider: "superpaybr",
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
      console.log("🧪 Simulando pagamento SuperPayBR para:", externalId)

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          amount: Number.parseFloat(amount),
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Pagamento SuperPayBR simulado com sucesso!")
        track("payment_simulated", {
          external_id: externalId,
          amount: Number.parseFloat(amount),
          provider: "superpaybr",
        })
      } else {
        console.error("❌ Erro na simulação SuperPayBR:", result.error)
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
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos seu pagamento</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(amount).toFixed(2)}</p>
              <p>Método: {method}</p>
              <p>Provider: SuperPayBR</p>
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
            <p className="text-sm text-gray-500">Powered by SuperPayBR</p>
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

          {/* Status do Pagamento */}
          {paymentStatus === "confirmed" && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">Pagamento Confirmado!</span>
              </div>
              <p className="text-green-700 text-sm mt-2">Redirecionando para ativação do cartão...</p>
            </div>
          )}

          {/* Informações do Pagamento */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold mb-3">Detalhes do Pagamento</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Valor:</span>
                <span className="font-bold">R$ {invoice ? (invoice.valores.bruto / 100).toFixed(2) : amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Método de Envio:</span>
                <span>{method}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo:</span>
                <span className="text-blue-600 font-medium">PIX SuperPayBR</span>
              </div>
              {externalId && (
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span className="text-xs text-gray-500">{externalId.substring(0, 20)}...</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          {invoice && (
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                <Image
                  src={invoice.pix.qr_code || "/placeholder.svg"}
                  alt="QR Code PIX SuperPayBR"
                  width={200}
                  height={200}
                  className="mx-auto"
                  crossOrigin="anonymous"
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Escaneie o QR Code com o app do seu banco ou copie o código PIX abaixo
              </p>

              {/* Código PIX */}
              <div className="bg-gray-100 p-3 rounded-lg mb-4">
                <p className="text-xs text-gray-600 mb-2">Código PIX:</p>
                <p className="text-xs font-mono break-all text-gray-800">{invoice.pix.payload}</p>
              </div>

              {/* Botão Copiar */}
              <button
                onClick={copyPixCode}
                className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-black/90 transition-colors flex items-center justify-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? "Código Copiado!" : "Copiar Código PIX"}</span>
              </button>
            </div>
          )}

          {/* Status do Webhook */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-blue-800 mb-2">Status do Monitoramento</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                Status: <span className="font-medium">{paymentStatus}</span>
              </p>
              <p>
                Aguardando webhook: <span className="font-medium">{isWaitingForWebhook ? "Sim" : "Não"}</span>
              </p>
              {lastWebhookCheck && (
                <p>
                  Última verificação: <span className="font-medium">{lastWebhookCheck.toLocaleTimeString()}</span>
                </p>
              )}
              {paymentData && (
                <p>
                  Dados recebidos: <span className="font-medium text-green-600">✓</span>
                </p>
              )}
            </div>
          </div>

          {/* Botão de Simulação (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && (
            <div className="mb-6">
              <button
                onClick={simulatePayment}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                🧪 Simular Pagamento (DEV)
              </button>
            </div>
          )}

          {/* Instruções */}
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              <strong>Como pagar:</strong>
            </p>
            <ol className="text-left space-y-1 mb-4">
              <li>1. Abra o app do seu banco</li>
              <li>2. Escolha a opção PIX</li>
              <li>3. Escaneie o QR Code ou cole o código</li>
              <li>4. Confirme o pagamento</li>
            </ol>
            <p className="text-xs text-gray-500">
              O pagamento será confirmado automaticamente em alguns segundos após a aprovação pelo seu banco.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
