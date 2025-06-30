"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Copy, CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from "lucide-react"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"

interface PaymentData {
  qr_code?: string
  qrcode?: string
  pix_code?: string
  external_id?: string
  invoice_id?: string
  amount?: number
  expires_at?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  // Obter dados do localStorage ou URL
  const shippingMethod = searchParams.get("shipping") || "pac"
  const amount = searchParams.get("amount") || "27.97"

  // Configurar monitoramento de webhook
  const {
    status: paymentStatus,
    isMonitoring,
    attempts,
    error: monitorError,
    lastCheck,
    progress,
  } = useSuperpayWebhookMonitor({
    externalId: paymentData?.external_id || "",
    enabled: !!paymentData?.external_id,
    interval: 3000, // 3 segundos
    maxAttempts: 200, // 10 minutos
    onPaymentConfirmed: (data) => {
      console.log("🎉 Pagamento confirmado via webhook!", data)
      // Redirecionamento é feito automaticamente pelo hook
    },
    onPaymentDenied: (data) => {
      console.log("❌ Pagamento negado via webhook!", data)
      setError("Pagamento foi negado. Tente novamente.")
    },
    onPaymentExpired: (data) => {
      console.log("⏰ Pagamento expirado via webhook!", data)
      setError("Pagamento expirou. Gere um novo PIX.")
    },
  })

  // Função para criar PIX
  const createPixPayment = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/superpaybr/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          description: `Frete ${shippingMethod.toUpperCase()} - Cartão SHEIN`,
          customer: {
            name: "Cliente SHEIN",
            email: "cliente@shein.com",
            document: "12345678901",
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Erro ao criar PIX")
      }

      console.log("✅ PIX criado com sucesso:", result.data)
      setPaymentData(result.data)
    } catch (err: any) {
      console.error("❌ Erro ao criar PIX:", err)
      setError(err.message || "Erro ao gerar PIX")
    } finally {
      setLoading(false)
    }
  }

  // Função para copiar código PIX
  const copyPixCode = async () => {
    if (!paymentData?.pix_code) return

    try {
      await navigator.clipboard.writeText(paymentData.pix_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  // Calcular tempo restante
  useEffect(() => {
    if (!paymentData?.expires_at) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(paymentData.expires_at!).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining("Expirado")
        clearInterval(interval)
        return
      }

      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [paymentData?.expires_at])

  // Criar PIX ao carregar a página
  useEffect(() => {
    createPixPayment()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
            <h2 className="text-xl font-semibold mb-2">Gerando PIX...</h2>
            <p className="text-gray-600">Aguarde enquanto preparamos seu pagamento</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2 text-red-600">Erro no Pagamento</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={createPixPayment} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento PIX</h1>
          <p className="text-gray-600">Escaneie o QR Code ou copie o código</p>
        </div>

        {/* Status do Monitoramento */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isMonitoring ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {isMonitoring ? "Monitorando pagamento" : "Monitoramento parado"}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {attempts}/{200} tentativas
              </span>
            </div>

            {isMonitoring && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}

            <div className="flex justify-between text-xs text-gray-500">
              <span>Status: {paymentStatus?.statusName || "Aguardando"}</span>
              {lastCheck && <span>Última verificação: {new Date(lastCheck).toLocaleTimeString()}</span>}
            </div>

            {monitorError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {monitorError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do Pagamento */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="text-sm text-gray-600 mb-1">Valor a pagar</div>
              <div className="text-3xl font-bold text-gray-800">R$ {amount}</div>
              <div className="text-sm text-gray-500">Frete {shippingMethod.toUpperCase()} - Cartão SHEIN</div>
            </div>

            {timeRemaining && (
              <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-orange-50 border border-orange-200 rounded">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Tempo restante: {timeRemaining}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code */}
        {paymentData?.qr_code && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <img
                  src={paymentData.qr_code || "/placeholder.svg"}
                  alt="QR Code PIX"
                  className="w-64 h-64 mx-auto border border-gray-200 rounded"
                />
              </div>
              <p className="text-sm text-gray-600">Escaneie o QR Code com seu app do banco</p>
            </CardContent>
          </Card>
        )}

        {/* Código PIX */}
        {paymentData?.pix_code && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Código PIX (Copia e Cola)</label>
                <div className="relative">
                  <textarea
                    value={paymentData.pix_code}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono resize-none"
                    rows={3}
                  />
                  <Button
                    onClick={copyPixCode}
                    size="sm"
                    className="absolute top-2 right-2"
                    variant={copied ? "default" : "outline"}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações do Pagamento */}
        {paymentData && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Detalhes do Pagamento</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID do Pagamento:</span>
                  <span className="font-mono text-xs">{paymentData.external_id}</span>
                </div>
                {paymentData.invoice_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID da Fatura:</span>
                    <span className="font-mono text-xs">{paymentData.invoice_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{paymentStatus?.statusName || "Aguardando Pagamento"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação */}
        <div className="space-y-3">
          <Button onClick={() => router.push("/form/success")} variant="outline" className="w-full">
            Já Paguei - Verificar Status
          </Button>

          <Button onClick={createPixPayment} variant="outline" className="w-full bg-transparent">
            Gerar Novo PIX
          </Button>

          <Button onClick={() => router.back()} variant="ghost" className="w-full">
            Voltar
          </Button>
        </div>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === "development" && (
          <Card className="mt-6 border-dashed">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2 text-xs">Debug Info</h4>
              <div className="text-xs space-y-1 font-mono">
                <div>External ID: {paymentData?.external_id}</div>
                <div>Monitoring: {isMonitoring ? "ON" : "OFF"}</div>
                <div>Attempts: {attempts}/200</div>
                <div>Status: {paymentStatus?.statusName || "N/A"}</div>
                <div>Source: {paymentStatus?.source || "N/A"}</div>
                {lastCheck && <div>Last Check: {new Date(lastCheck).toLocaleTimeString()}</div>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
