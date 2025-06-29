"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"

// Componente interno que usa useSearchParams
function CheckoutContent() {
  const searchParams = useSearchParams()
  const amount = Number.parseFloat(searchParams.get("amount") || "27.97")
  const method = searchParams.get("method") || "PAC"

  const [paymentStatus, setPaymentStatus] = useState<string>("pending")
  const [externalId, setExternalId] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [pixCode, setPixCode] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)

  // Estados visuais otimizados
  const statusColors = {
    confirmed: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
    expired: "bg-yellow-100 text-yellow-800",
    canceled: "bg-gray-100 text-gray-800",
    refunded: "bg-orange-100 text-orange-800",
    pending: "bg-blue-100 text-blue-800",
  }

  const statusMessages = {
    confirmed: "✅ Pagamento Confirmado!",
    denied: "❌ Pagamento Negado",
    expired: "⏰ Pagamento Vencido",
    canceled: "🚫 Pagamento Cancelado",
    refunded: "🔄 Pagamento Estornado",
    pending: "⏳ Aguardando Pagamento...",
  }

  // Hook otimizado para monitoramento de webhook
  const { paymentData, isLoading, error, checkCount, retryCount, forceCheck } = useSuperpayWebhookMonitor({
    externalId,
    enabled: paymentStatus === "pending" && !!externalId,
    interval: 3000,
    maxRetries: 10,
    backoffMultiplier: 1.2,
    onPaid: (data) => {
      console.log("🎉 Pagamento confirmado via webhook!", data)
      setPaymentStatus("confirmed")
      setTimeout(() => {
        window.location.href = "/success"
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
    onError: (error) => {
      console.error("❌ Erro no monitoramento:", error)
    },
  })

  // Timer countdown otimizado
  useEffect(() => {
    if (paymentStatus !== "pending" || timeLeft <= 0) return

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
  }, [paymentStatus, timeLeft])

  // Criar pagamento SuperPay
  const createPayment = async () => {
    try {
      setIsCreatingPayment(true)
      console.log("🚀 Criando pagamento SuperPay...")

      const response = await fetch("/api/superpaybr/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 100, // Converter para centavos
          description: `Cartão SHEIN - Frete ${method}`,
          customer: {
            name: "Cliente Teste",
            email: "cliente@teste.com",
            document: "12345678901",
          },
        }),
      })

      const result = await response.json()
      console.log("📄 Resposta SuperPay:", result)

      if (result.success && result.data) {
        setExternalId(result.data.external_id)
        setQrCodeUrl(result.data.qr_code || "")
        setPixCode(result.data.pix_code || "")
        console.log("✅ Pagamento criado:", result.data.external_id)
      } else {
        throw new Error(result.error || "Erro ao criar pagamento")
      }
    } catch (error) {
      console.error("❌ Erro ao criar pagamento:", error)
      alert("Erro ao criar pagamento. Tente novamente.")
    } finally {
      setIsCreatingPayment(false)
    }
  }

  // Simular pagamento para testes
  const simulatePayment = async () => {
    if (!externalId) return

    try {
      console.log("🧪 Simulando pagamento...")
      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          status: "paid",
        }),
      })

      const result = await response.json()
      console.log("✅ Simulação enviada:", result)
    } catch (error) {
      console.error("❌ Erro na simulação:", error)
    }
  }

  const copyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode)
      // Mostrar feedback visual
      const button = document.getElementById("copy-button")
      if (button) {
        const originalText = button.textContent
        button.textContent = "✅ Copiado!"
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finalizar Pagamento</h1>
          <p className="text-gray-600">
            Cartão SHEIN - Frete {method} - R$ {amount.toFixed(2)}
          </p>
        </div>

        {/* Status do Pagamento */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status do Pagamento</CardTitle>
              <Badge className={statusColors[paymentStatus as keyof typeof statusColors]}>
                {statusMessages[paymentStatus as keyof typeof statusMessages]}
              </Badge>
            </div>
            {paymentStatus === "pending" && <CardDescription>Tempo restante: {formatTime(timeLeft)}</CardDescription>}
          </CardHeader>
          <CardContent>
            {!externalId ? (
              <div className="text-center">
                <Button onClick={createPayment} disabled={isCreatingPayment} className="w-full">
                  {isCreatingPayment ? "⏳ Gerando PIX..." : "🚀 Gerar PIX"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="text-center">
                  <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="QR Code PIX"
                        className="w-64 h-64 mx-auto"
                        onError={(e) => {
                          // Fallback para QR code gerado
                          const target = e.target as HTMLImageElement
                          target.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode || "PIX")}`
                        }}
                      />
                    ) : (
                      <div className="w-64 h-64 bg-gray-100 flex items-center justify-center rounded">
                        <span className="text-gray-500">Gerando QR Code...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
                </div>

                {/* PIX Code */}
                {pixCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Código PIX (Copia e Cola):</label>
                    <div className="flex gap-2">
                      <Input value={pixCode} readOnly className="font-mono text-xs" />
                      <Button id="copy-button" onClick={copyPixCode} variant="outline">
                        📋 Copiar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Informações de Debug */}
                {process.env.NODE_ENV === "development" && (
                  <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
                    <div>
                      <strong>External ID:</strong> {externalId}
                    </div>
                    <div>
                      <strong>Verificações:</strong> {checkCount} (Retry: {retryCount})
                    </div>
                    <div>
                      <strong>Status Webhook:</strong> {paymentData ? "Encontrado" : "Aguardando"}
                    </div>
                    {error && (
                      <div className="text-red-600">
                        <strong>Erro:</strong> {error}
                      </div>
                    )}
                    <div className="pt-2">
                      <Button onClick={simulatePayment} size="sm" variant="outline">
                        🧪 Simular Pagamento
                      </Button>
                      <Button onClick={forceCheck} size="sm" variant="outline" className="ml-2 bg-transparent">
                        🔄 Forçar Verificação
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Abra o app do seu banco</li>
              <li>Procure pela opção PIX</li>
              <li>Escaneie o QR Code ou cole o código PIX</li>
              <li>Confirme o pagamento</li>
              <li>Aguarde a confirmação automática</li>
            </ol>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Detecção Automática:</strong> Assim que o pagamento for confirmado, você será redirecionado
                automaticamente. Não feche esta página!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Componente principal com Suspense
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Carregando checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
