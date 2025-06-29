"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Copy, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pixCode, setPixCode] = useState<string>("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [externalId, setExternalId] = useState<string>("")
  const [invoiceId, setInvoiceId] = useState<string>("")
  const [amount, setAmount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [copied, setCopied] = useState(false)

  // ✅ MONITORAMENTO VIA WEBHOOK
  const {
    paymentStatus,
    status,
    isWaitingForWebhook,
    error: webhookError,
  } = useSuperpayWebhookMonitor({
    externalId,
    invoiceId,
    enableDebug: true,
    onPaymentConfirmed: (data) => {
      console.log("🎉 Pagamento confirmado via webhook!", data)
    },
    onPaymentDenied: (data) => {
      console.log("❌ Pagamento negado via webhook!", data)
    },
    onPaymentExpired: (data) => {
      console.log("⏰ Pagamento vencido via webhook!", data)
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 Pagamento cancelado via webhook!", data)
    },
    onPaymentRefunded: (data) => {
      console.log("↩️ Pagamento estornado via webhook!", data)
    },
  })

  // Criar fatura PIX
  useEffect(() => {
    const createPixInvoice = async () => {
      try {
        setIsLoading(true)
        setError("")

        const selectedValue = searchParams.get("value") || "1"
        const invoiceAmount = selectedValue === "1" ? 1.0 : selectedValue === "10" ? 10.0 : 100.0

        setAmount(invoiceAmount)

        console.log("🚀 Criando fatura PIX SuperPayBR:", { amount: invoiceAmount })

        const response = await fetch("/api/superpaybr/create-invoice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: invoiceAmount,
            description: `Pagamento PIX - R$ ${invoiceAmount.toFixed(2)}`,
            external_id: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }),
        })

        const data = await response.json()

        if (data.success && data.invoice) {
          setExternalId(data.invoice.external_id)
          setInvoiceId(data.invoice.id)
          setPixCode(data.invoice.payment?.details?.pix_code || "")
          setQrCodeUrl(data.qrCodeUrl || "")

          console.log("✅ Fatura PIX criada com sucesso:", {
            external_id: data.invoice.external_id,
            invoice_id: data.invoice.id,
            pix_code: data.invoice.payment?.details?.pix_code?.substring(0, 50) + "...",
          })
        } else {
          throw new Error(data.error || "Erro ao criar fatura PIX")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
        setError(errorMessage)
        console.error("❌ Erro ao criar fatura PIX:", errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    createPixInvoice()
  }, [searchParams])

  const copyPixCode = async () => {
    if (pixCode) {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "confirmed":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "denied":
        return <XCircle className="h-6 w-6 text-red-500" />
      case "expired":
        return <Clock className="h-6 w-6 text-orange-500" />
      case "canceled":
        return <XCircle className="h-6 w-6 text-gray-500" />
      case "refunded":
        return <AlertCircle className="h-6 w-6 text-blue-500" />
      default:
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
    }
  }

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case "confirmed":
        return "Pagamento confirmado! Redirecionando..."
      case "denied":
        return "Pagamento negado"
      case "expired":
        return "Pagamento vencido"
      case "canceled":
        return "Pagamento cancelado"
      case "refunded":
        return "Pagamento estornado"
      default:
        return isWaitingForWebhook ? "Aguardando confirmação do pagamento..." : "Processando..."
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
            <h2 className="text-xl font-semibold mb-2">Gerando PIX...</h2>
            <p className="text-gray-600">Aguarde enquanto preparamos seu pagamento</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2 text-red-600">Erro ao gerar PIX</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento PIX</h1>
          <p className="text-gray-600">Valor: R$ {amount.toFixed(2)}</p>
        </div>

        {/* Status do Pagamento */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">{getStatusIcon()}</div>
            <h3 className="text-lg font-semibold mb-2">{getStatusMessage()}</h3>
            {status && (
              <div className="text-sm text-gray-600">
                <p>Status: {status.statusName}</p>
                <p>Código: {status.statusCode}</p>
              </div>
            )}
            {webhookError && <p className="text-sm text-red-500 mt-2">Erro: {webhookError}</p>}
          </CardContent>
        </Card>

        {/* QR Code */}
        {qrCodeUrl && paymentStatus === "waiting" && (
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-4">Escaneie o QR Code</h3>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm text-gray-600 mt-4">Abra o app do seu banco e escaneie o código QR para pagar</p>
            </CardContent>
          </Card>
        )}

        {/* PIX Copia e Cola */}
        {pixCode && paymentStatus === "waiting" && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">PIX Copia e Cola</h3>
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-gray-600 break-all font-mono">{pixCode}</p>
              </div>
              <Button onClick={copyPixCode} className="w-full bg-transparent" variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copiado!" : "Copiar código PIX"}
              </Button>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Ou copie o código PIX e cole no seu app de pagamentos
              </p>
            </CardContent>
          </Card>
        )}

        {/* Informações de Debug */}
        {externalId && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">Informações do Pagamento</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>External ID: {externalId}</p>
                <p>Invoice ID: {invoiceId}</p>
                <p>Status: {paymentStatus}</p>
                <p>Aguardando webhook: {isWaitingForWebhook ? "Sim" : "Não"}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botão Voltar */}
        <div className="text-center">
          <Button onClick={() => router.back()} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    </div>
  )
}
