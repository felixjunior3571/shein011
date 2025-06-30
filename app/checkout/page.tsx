"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, QrCode, Copy, RefreshCw, AlertTriangle, CreditCard, Smartphone, Zap } from "lucide-react"
import { useSuperPayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parâmetros da URL
  const amount = Number.parseFloat(searchParams.get("amount") || "34.90")
  const productName = searchParams.get("product") || "Cartão SHEIN"
  const shippingMethod = searchParams.get("shipping") || "express"

  // Estados locais
  const [externalId, setExternalId] = useState<string>("")
  const [qrCodeData, setQrCodeData] = useState<string>("")
  const [pixCode, setPixCode] = useState<string>("")
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)

  // Gerar External ID único
  useEffect(() => {
    const id = `SHEIN_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    setExternalId(id)
    console.log("🆔 External ID gerado:", id)
  }, [])

  // Hook de monitoramento SuperPay
  const {
    status,
    isWaitingForWebhook,
    error: webhookError,
    checkCount,
    maxChecks,
    lastCheck,
    tokenExpired,
    checkNow,
    isPaid,
    isDenied,
    isExpired,
    isCanceled,
    statusName,
  } = useSuperPayWebhookMonitor({
    externalId,
    checkInterval: 2000, // 2 segundos
    maxChecks: 450, // 15 minutos
    enableDebug: true,
    onPaymentConfirmed: (data) => {
      console.log("🎉 Pagamento confirmado! Redirecionando...", data)
      setShowPaymentConfirmation(true)

      // Salvar dados no localStorage
      localStorage.setItem(
        "paymentData",
        JSON.stringify({
          externalId: data.externalId,
          amount: data.amount,
          paymentDate: data.paymentDate,
          statusName: data.statusName,
          token: data.token,
        }),
      )

      // Redirecionar após 3 segundos
      setTimeout(() => {
        router.push("/upp/001")
      }, 3000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ Pagamento negado:", data)
      alert(`Pagamento negado: ${data.statusName}`)
    },
    onPaymentExpired: (data) => {
      console.log("⏰ Pagamento vencido:", data)
      alert(`Pagamento vencido: ${data.statusName}`)
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 Pagamento cancelado:", data)
      alert(`Pagamento cancelado: ${data.statusName}`)
    },
    onTokenExpired: (data) => {
      console.log("⏰ Token expirado:", data)
      alert("Token de verificação expirado. Recarregue a página para gerar um novo PIX.")
    },
    onError: (error) => {
      console.error("❌ Erro no monitoramento:", error)
    },
  })

  // Criar fatura SuperPay
  const createSuperPayInvoice = async () => {
    if (!externalId) {
      console.error("❌ External ID não disponível")
      return
    }

    setIsCreatingInvoice(true)
    setInvoiceError(null)

    try {
      console.log("🔄 Criando fatura SuperPay:", { externalId, amount })

      const response = await fetch("/api/superpay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId,
          amount,
          description: `${productName} - Frete ${shippingMethod}`,
          customerName: "Cliente SHEIN",
          customerEmail: "cliente@shein.com",
          customerDocument: "12345678901",
        }),
      })

      const result = await response.json()
      console.log("📥 Resposta da criação de fatura:", result)

      if (result.success && result.data) {
        setQrCodeData(result.data.qrcode || "")
        setPixCode(result.data.pix_code || "")
        console.log("✅ Fatura SuperPay criada com sucesso")
      } else {
        throw new Error(result.error || "Erro ao criar fatura")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("❌ Erro ao criar fatura SuperPay:", errorMessage)
      setInvoiceError(errorMessage)
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  // Simular pagamento (para testes)
  const simulatePayment = async () => {
    if (!externalId) return

    try {
      console.log("🧪 Simulando pagamento SuperPay:", externalId)

      const response = await fetch("/api/superpay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId,
          amount,
          statusCode: 5, // Status "Pago"
        }),
      })

      const result = await response.json()
      console.log("📥 Resposta da simulação:", result)

      if (result.success) {
        console.log("✅ Pagamento simulado com sucesso")
        // O hook vai detectar automaticamente
      } else {
        console.error("❌ Erro na simulação:", result.error)
      }
    } catch (error) {
      console.error("❌ Erro ao simular pagamento:", error)
    }
  }

  // Copiar código PIX
  const copyPixCode = async () => {
    if (pixCode) {
      await navigator.clipboard.writeText(pixCode)
      alert("Código PIX copiado!")
    }
  }

  // Criar fatura automaticamente quando External ID estiver disponível
  useEffect(() => {
    if (externalId && !qrCodeData && !isCreatingInvoice) {
      createSuperPayInvoice()
    }
  }, [externalId, qrCodeData, isCreatingInvoice])

  // Mostrar confirmação de pagamento
  if (showPaymentConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-green-800 mb-2">Pagamento Confirmado!</h1>
              <p className="text-green-600">Seu pagamento foi processado com sucesso</p>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <div>
                Valor: <strong>R$ {amount.toFixed(2)}</strong>
              </div>
              <div>
                Status: <strong>{statusName}</strong>
              </div>
              <div>
                ID: <strong>{externalId}</strong>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Redirecionando em 3 segundos...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finalizar Pagamento</h1>
          <p className="text-gray-600">Complete seu pedido com PIX SuperPay</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resumo do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Resumo do Pedido</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>{productName}</span>
                <span>R$ {(amount - 5).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete {shippingMethod}</span>
                <span>R$ 5,00</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>R$ {amount.toFixed(2)}</span>
              </div>

              {/* Status do Monitoramento */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Status do Pagamento</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={isPaid ? "default" : "secondary"}>{statusName}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Verificações:</span>
                    <span>
                      {checkCount}/{maxChecks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monitorando:</span>
                    <span className={isWaitingForWebhook ? "text-green-600" : "text-gray-500"}>
                      {isWaitingForWebhook ? "✅ Ativo" : "❌ Inativo"}
                    </span>
                  </div>
                  {lastCheck && (
                    <div className="flex justify-between">
                      <span>Última verificação:</span>
                      <span className="text-xs">{new Date(lastCheck).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* External ID */}
              <div className="text-xs text-gray-500 font-mono">ID: {externalId}</div>
            </CardContent>
          </Card>

          {/* PIX SuperPay */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Pagamento PIX</span>
                <Badge className="bg-purple-100 text-purple-800">SuperPay</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Erro na criação da fatura */}
              {invoiceError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erro:</strong> {invoiceError}
                    <Button onClick={createSuperPayInvoice} variant="outline" size="sm" className="ml-2 bg-transparent">
                      Tentar Novamente
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Erro no webhook */}
              {webhookError && (
                <Alert className="mb-4 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Aviso:</strong> {webhookError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Token expirado */}
              {tokenExpired && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Token Expirado:</strong> Recarregue a página para gerar um novo PIX.
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="ml-2">
                      Recarregar
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Loading da fatura */}
              {isCreatingInvoice && (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Gerando PIX SuperPay...</p>
                </div>
              )}

              {/* QR Code e PIX */}
              {qrCodeData && !isCreatingInvoice && (
                <div className="space-y-6">
                  {/* QR Code */}
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                      {qrCodeData ? (
                        <img
                          src={`data:image/png;base64,${qrCodeData}`}
                          alt="QR Code PIX"
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                          <QrCode className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
                  </div>

                  {/* Código PIX */}
                  {pixCode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={pixCode}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                        />
                        <Button onClick={copyPixCode} variant="outline" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Instruções */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Como pagar:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Abra o app do seu banco</li>
                      <li>2. Escaneie o QR Code ou cole o código PIX</li>
                      <li>3. Confirme o pagamento</li>
                      <li>4. Aguarde a confirmação automática</li>
                    </ol>
                  </div>

                  {/* Status de monitoramento */}
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    {isWaitingForWebhook ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>
                          Aguardando pagamento... ({checkCount}/{maxChecks})
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>Monitoramento inativo</span>
                      </>
                    )}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex space-x-2">
                    <Button onClick={checkNow} variant="outline" className="flex-1 bg-transparent">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Verificar Agora
                    </Button>
                    <Button onClick={simulatePayment} variant="outline" className="flex-1 bg-transparent">
                      <Zap className="w-4 h-4 mr-2" />🧪 Simular Pagamento
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Debug Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">🔧 Debug SuperPay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <strong>External ID:</strong>
                <div className="font-mono">{externalId}</div>
              </div>
              <div>
                <strong>Status:</strong>
                <div>{statusName}</div>
              </div>
              <div>
                <strong>Verificações:</strong>
                <div>
                  {checkCount}/{maxChecks}
                </div>
              </div>
              <div>
                <strong>Monitorando:</strong>
                <div className={isWaitingForWebhook ? "text-green-600" : "text-red-600"}>
                  {isWaitingForWebhook ? "Sim" : "Não"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
