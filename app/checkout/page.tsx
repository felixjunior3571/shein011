"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SmartQRCode } from "@/components/smart-qr-code"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"
import { Clock, CreditCard, CheckCircle, XCircle, RefreshCw, AlertTriangle, Copy, Smartphone } from "lucide-react"

interface PaymentData {
  externalId: string
  amount: number
  pixCode: string
  qrCode: string
  dueDate: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [isSimulating, setIsSimulating] = useState(false)

  // Monitoramento via webhook SuperPay
  const { paymentStatus, isMonitoring, error } = useSuperpayWebhookMonitor({
    externalId: paymentData?.externalId || "",
    onPaymentConfirmed: () => {
      console.log("🎉 PAGAMENTO CONFIRMADO! Redirecionando...")
      setNotificationMessage("🎉 Pagamento confirmado! Redirecionando...")
      setShowNotification(true)
      setTimeout(() => {
        router.push("/upp/001")
      }, 2000)
    },
    onPaymentDenied: () => {
      console.log("❌ PAGAMENTO NEGADO!")
      setNotificationMessage("❌ Pagamento negado. Tente outro método de pagamento.")
      setShowNotification(true)
    },
    onPaymentExpired: () => {
      console.log("⏰ PAGAMENTO VENCIDO!")
      setNotificationMessage("⏰ Pagamento vencido. Gere um novo PIX.")
      setShowNotification(true)
    },
    onPaymentCanceled: () => {
      console.log("🚫 PAGAMENTO CANCELADO!")
      setNotificationMessage("🚫 Pagamento cancelado.")
      setShowNotification(true)
    },
    onPaymentRefunded: () => {
      console.log("🔄 PAGAMENTO ESTORNADO!")
      setNotificationMessage("🔄 Pagamento estornado.")
      setShowNotification(true)
    },
    checkInterval: 3000, // Verificar a cada 3 segundos
  })

  // Carregar dados do pagamento
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setLoading(true)

        // Simular criação de PIX SuperPay
        const response = await fetch("/api/superpaybr/create-activation-invoice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 10.0,
            description: "Ativação do Cartão SHEIN",
            customer: {
              name: "Cliente Teste",
              email: "cliente@teste.com",
              document: "12345678901",
            },
          }),
        })

        if (response.ok) {
          const data = await response.json()

          if (data.success && data.data) {
            setPaymentData({
              externalId: data.data.external_id,
              amount: data.data.amount,
              pixCode: data.data.pix_code || "PIX_CODE_PLACEHOLDER",
              qrCode: data.data.qr_code || "QR_CODE_PLACEHOLDER",
              dueDate: data.data.due_date || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            })
            console.log("✅ PIX SuperPay criado com sucesso:", data.data)
          } else {
            console.log("⚠️ Usando dados de fallback para desenvolvimento")
            // Fallback para desenvolvimento
            const fallbackExternalId = `dev_${Date.now()}`
            setPaymentData({
              externalId: fallbackExternalId,
              amount: 10.0,
              pixCode:
                "00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5925SHEIN CARTAO ATIVACAO6009SAO PAULO62070503***6304ABCD",
              qrCode:
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
              dueDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            })
          }
        } else {
          console.log("⚠️ Erro na API, usando dados de fallback")
          // Fallback para desenvolvimento
          const fallbackExternalId = `dev_${Date.now()}`
          setPaymentData({
            externalId: fallbackExternalId,
            amount: 10.0,
            pixCode:
              "00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5925SHEIN CARTAO ATIVACAO6009SAO PAULO62070503***6304ABCD",
            qrCode: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            dueDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          })
        }
      } catch (error) {
        console.error("Erro ao carregar dados do pagamento:", error)
        // Fallback para desenvolvimento
        const fallbackExternalId = `dev_${Date.now()}`
        setPaymentData({
          externalId: fallbackExternalId,
          amount: 10.0,
          pixCode:
            "00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5925SHEIN CARTAO ATIVACAO6009SAO PAULO62070503***6304ABCD",
          qrCode: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
          dueDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
      } finally {
        setLoading(false)
      }
    }

    loadPaymentData()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setNotificationMessage("⏰ Tempo esgotado! Gere um novo PIX.")
          setShowNotification(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Simular pagamento para desenvolvimento
  const simulatePayment = async () => {
    if (!paymentData) return

    setIsSimulating(true)
    try {
      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId: paymentData.externalId,
          status: 5, // Status "Pago"
        }),
      })

      if (response.ok) {
        console.log("✅ Pagamento simulado com sucesso")
        setNotificationMessage("🧪 Pagamento simulado! Aguarde a confirmação...")
        setShowNotification(true)
      }
    } catch (error) {
      console.error("Erro ao simular pagamento:", error)
    } finally {
      setIsSimulating(false)
    }
  }

  const copyPixCode = () => {
    if (paymentData?.pixCode) {
      navigator.clipboard.writeText(paymentData.pixCode)
      setNotificationMessage("📋 Código PIX copiado!")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 2000)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-4" />
            <p className="text-lg font-medium">Gerando PIX SuperPay...</p>
            <p className="text-sm text-gray-500 mt-2">Aguarde um momento</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finalizar Pagamento</h1>
          <p className="text-gray-600">Complete o pagamento via PIX para ativar seu cartão SHEIN</p>
        </div>

        {/* Notification */}
        {showNotification && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{notificationMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Detalhes do Pagamento
              </CardTitle>
              <CardDescription>Informações da sua transação SuperPay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valor:</span>
                <span className="text-lg font-bold text-green-600">R$ {paymentData?.amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">External ID:</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{paymentData?.externalId}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <div className="flex items-center gap-2">
                  {paymentStatus.isPaid ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Pago
                    </Badge>
                  ) : paymentStatus.isDenied ? (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
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
                      Aguardando
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monitoramento:</span>
                <div className="flex items-center gap-2">
                  {isMonitoring ? (
                    <Badge variant="default" className="bg-blue-500">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tempo restante:</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className={`font-mono text-lg ${timeLeft < 60 ? "text-red-500" : "text-orange-500"}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>Erro no monitoramento: {error}</AlertDescription>
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
                <SmartQRCode value={paymentData?.pixCode || ""} size={200} className="border rounded-lg p-4 bg-white" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Código PIX:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paymentData?.pixCode || ""}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                  />
                  <Button onClick={copyPixCode} size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Abra o app do seu banco e escaneie o QR Code</p>
                <p className="text-xs text-gray-500">Ou copie e cole o código PIX no seu app</p>
              </div>

              {/* Simulação para desenvolvimento */}
              <Separator />
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">Ambiente de desenvolvimento</p>
                <Button
                  onClick={simulatePayment}
                  disabled={isSimulating || paymentStatus.isPaid}
                  size="sm"
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Simulando...
                    </>
                  ) : (
                    "🧪 Simular Pagamento"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Como pagar com PIX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Smartphone className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium mb-1">1. Abra seu app</h3>
                <p className="text-sm text-gray-600">Abra o aplicativo do seu banco ou carteira digital</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-600 font-bold">QR</span>
                </div>
                <h3 className="font-medium mb-1">2. Escaneie o código</h3>
                <p className="text-sm text-gray-600">Use a câmera para escanear o QR Code acima</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium mb-1">3. Confirme o pagamento</h3>
                <p className="text-sm text-gray-600">Revise os dados e confirme a transação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="mt-8 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Debug - Sistema SuperPay Webhook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500">External ID:</span>
                <p className="font-mono">{paymentData?.externalId}</p>
              </div>
              <div>
                <span className="text-gray-500">Monitoramento:</span>
                <p className={isMonitoring ? "text-green-600" : "text-red-600"}>
                  {isMonitoring ? "Ativo (3s)" : "Inativo"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Última verificação:</span>
                <p>{paymentStatus.lastUpdate ? new Date(paymentStatus.lastUpdate).toLocaleTimeString() : "N/A"}</p>
              </div>
              <div>
                <span className="text-gray-500">Storage:</span>
                <p className="text-blue-600">Supabase Only</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
