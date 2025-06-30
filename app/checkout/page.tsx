"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SmartQRCode } from "@/components/smart-qr-code"
import { usePureWebhookMonitor } from "@/hooks/use-pure-webhook-monitor"

interface InvoiceData {
  id: string
  external_id: string
  status: {
    code: number
    title: string
  }
  payment: {
    details: {
      qrcode?: string
      pix_code?: string
    }
  }
  prices: {
    total: number
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parâmetros da URL
  const amount = searchParams.get("amount") || "34.90"
  const method = searchParams.get("method") || "SEDEX"

  // Estados
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [externalId, setExternalId] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [copySuccess, setCopySuccess] = useState(false)

  // Gerar external ID único
  useEffect(() => {
    const id = `CHECKOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setExternalId(id)
  }, [])

  // Monitor de webhook
  const { status: paymentStatus, isLoading: isCheckingPayment } = usePureWebhookMonitor({
    externalId,
    onPaymentConfirmed: (data) => {
      console.log("🎉 Pagamento confirmado! Redirecionando...")
      setTimeout(() => {
        router.push("/upp/001")
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ Pagamento negado")
      setError("Pagamento foi negado. Tente novamente.")
    },
    onPaymentExpired: (data) => {
      console.log("⏰ Pagamento expirado")
      setError("Pagamento expirou. Gere um novo PIX.")
    },
  })

  // Timer de expiração
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setError("PIX expirado. Recarregue a página para gerar um novo.")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Criar fatura PIX
  useEffect(() => {
    if (!externalId) return

    const createInvoice = async () => {
      try {
        setIsCreatingInvoice(true)
        setError(null)

        console.log(`💳 Criando fatura PIX: ${externalId}`)

        const response = await fetch("/api/superpaybr/create-invoice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Number.parseFloat(amount),
            external_id: externalId,
            customer_name: "Cliente Shein Card",
            customer_email: "cliente@sheincard.com",
            customer_cpf: "", // Será gerado automaticamente
          }),
        })

        const result = await response.json()

        if (result.success) {
          setInvoice(result.data)
          console.log("✅ Fatura criada:", result.data)

          if (result.fallback_mode) {
            console.log("⚠️ Modo fallback ativado")
          }

          if (result.emergency_mode) {
            console.log("🚨 Modo emergência ativado")
          }
        } else {
          throw new Error(result.error || "Erro ao criar fatura")
        }
      } catch (err) {
        console.log("❌ Erro ao criar fatura:", err)
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      } finally {
        setIsCreatingInvoice(false)
      }
    }

    createInvoice()
  }, [externalId, amount])

  // Copiar código PIX
  const copyPixCode = async () => {
    if (!invoice?.payment?.details?.pix_code) return

    try {
      await navigator.clipboard.writeText(invoice.payment.details.pix_code)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.log("Erro ao copiar:", err)
    }
  }

  // Simular pagamento (desenvolvimento)
  const simulatePayment = async () => {
    try {
      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          amount: Number.parseFloat(amount),
          redirect_type: "checkout",
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Pagamento simulado com sucesso")
      }
    } catch (err) {
      console.log("❌ Erro na simulação:", err)
    }
  }

  // Formatação do timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Estados de carregamento
  if (isCreatingInvoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Gerando PIX...</h2>
            <p className="text-gray-600">Aguarde enquanto preparamos seu pagamento</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold mb-2 text-red-700">Erro no Pagamento</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-semibold mb-2">Carregando...</h2>
            <p className="text-gray-600">Preparando seu pagamento PIX</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Status de pagamento confirmado
  if (paymentStatus?.isPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2 text-green-700">Pagamento Confirmado!</h2>
            <p className="text-gray-600 mb-4">
              Seu pagamento de <strong>R$ {(paymentStatus.amount || Number.parseFloat(amount)).toFixed(2)}</strong> foi
              confirmado.
            </p>
            <p className="text-sm text-gray-500 mb-4">Redirecionando automaticamente...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Pagamento PIX</h1>
            <p className="text-gray-600">
              Valor: <span className="font-semibold text-lg">R$ {Number.parseFloat(amount).toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-500">Método: {method}</p>
          </div>

          {/* Timer */}
          <div className="text-center mb-6">
            <div className={`text-3xl font-mono font-bold ${timeLeft < 60 ? "text-red-600" : "text-blue-600"}`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-sm text-gray-500">Tempo restante para pagamento</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <SmartQRCode
              qrCodeUrl={invoice.payment?.details?.qrcode}
              pixCode={invoice.payment?.details?.pix_code}
              size={250}
            />
          </div>

          {/* Código PIX */}
          {invoice.payment?.details?.pix_code && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Código PIX (Copia e Cola)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invoice.payment.details.pix_code}
                  readOnly
                  className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <Button
                  onClick={copyPixCode}
                  variant={copySuccess ? "default" : "outline"}
                  className={copySuccess ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {copySuccess ? "✅" : "📋"}
                </Button>
              </div>
              {copySuccess && <p className="text-sm text-green-600 mt-1">Código copiado!</p>}
            </div>
          )}

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Como pagar:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Abra o app do seu banco</li>
              <li>2. Escaneie o QR Code ou cole o código PIX</li>
              <li>3. Confirme o pagamento</li>
              <li>4. Aguarde a confirmação automática</li>
            </ol>
          </div>

          {/* Observação importante */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Importante:</strong> Após realizar o pagamento, aguarde nesta página. O redirecionamento será
              automático quando o pagamento for confirmado.
            </p>
          </div>

          {/* Status */}
          <div className="text-center mb-4">
            {isCheckingPayment ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Aguardando pagamento...</span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Verificação automática ativa</p>
            )}
          </div>

          {/* Botão de simulação (desenvolvimento) */}
          {process.env.NODE_ENV === "development" && (
            <div className="border-t pt-4">
              <Button onClick={simulatePayment} variant="outline" className="w-full text-sm bg-transparent">
                🧪 Simular Pagamento (Dev)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
