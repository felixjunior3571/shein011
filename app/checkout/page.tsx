"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff, CheckCircle, XCircle, Clock, AlertTriangle, Activity } from "lucide-react"
import { useRealtimePaymentMonitor } from "@/hooks/use-realtime-payment-monitor"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [externalId, setExternalId] = useState<string>("")

  // Obter external_id dos parâmetros da URL ou gerar um novo
  useEffect(() => {
    const urlExternalId = searchParams.get("external_id")
    if (urlExternalId) {
      setExternalId(urlExternalId)
    } else {
      // Gerar um external_id único se não fornecido
      const newExternalId = `SHEIN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      setExternalId(newExternalId)
      // Atualizar URL sem recarregar a página
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.set("external_id", newExternalId)
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [searchParams])

  // Hook do monitor Realtime
  const { isConnected, isConnecting, error, lastUpdate, currentStatus, connectionAttempts, reconnect } =
    useRealtimePaymentMonitor({
      externalId,
      enabled: !!externalId,
      onPaymentConfirmed: (payment) => {
        console.log("🎉 Pagamento confirmado! Redirecionando para /upp/001")
        setTimeout(() => {
          router.push("/upp/001")
        }, 2000) // Delay de 2 segundos para mostrar a confirmação
      },
      onPaymentDenied: (payment) => {
        console.log("❌ Pagamento negado! Redirecionando para página de erro")
        setTimeout(() => {
          router.push("/payment-error?reason=denied")
        }, 2000)
      },
      onPaymentExpired: (payment) => {
        console.log("⏰ Pagamento vencido! Redirecionando para página de erro")
        setTimeout(() => {
          router.push("/payment-error?reason=expired")
        }, 2000)
      },
      onPaymentCanceled: (payment) => {
        console.log("🚫 Pagamento cancelado! Redirecionando para página de erro")
        setTimeout(() => {
          router.push("/payment-error?reason=canceled")
        }, 2000)
      },
    })

  // Ícone de status da conexão
  const getConnectionIcon = () => {
    if (isConnecting) return <Activity className="h-5 w-5 animate-spin text-blue-500" />
    if (isConnected) return <Wifi className="h-5 w-5 text-green-500" />
    if (error) return <WifiOff className="h-5 w-5 text-red-500" />
    return <WifiOff className="h-5 w-5 text-gray-400" />
  }

  // Badge de status da conexão
  const getConnectionBadge = () => {
    if (isConnecting) return <Badge variant="outline">Conectando...</Badge>
    if (isConnected) return <Badge className="bg-green-500">Conectado</Badge>
    if (error) return <Badge variant="destructive">Erro</Badge>
    return <Badge variant="secondary">Desconectado</Badge>
  }

  // Ícone de status do pagamento
  const getPaymentStatusIcon = () => {
    if (!currentStatus) return <Clock className="h-8 w-8 text-blue-500 animate-pulse" />
    if (currentStatus.is_paid) return <CheckCircle className="h-8 w-8 text-green-500" />
    if (currentStatus.is_denied) return <XCircle className="h-8 w-8 text-red-500" />
    if (currentStatus.is_expired) return <Clock className="h-8 w-8 text-orange-500" />
    if (currentStatus.is_canceled) return <AlertTriangle className="h-8 w-8 text-yellow-500" />
    return <Clock className="h-8 w-8 text-blue-500 animate-pulse" />
  }

  // Título do status do pagamento
  const getPaymentStatusTitle = () => {
    if (!currentStatus) return "Aguardando confirmação..."
    return currentStatus.status_title
  }

  // Descrição do status do pagamento
  const getPaymentStatusDescription = () => {
    if (!currentStatus) return "Processando seu pagamento PIX..."
    if (currentStatus.is_paid) return "Pagamento confirmado! Redirecionando..."
    if (currentStatus.is_denied) return "Pagamento foi negado. Redirecionando..."
    if (currentStatus.is_expired) return "Pagamento venceu. Redirecionando..."
    if (currentStatus.is_canceled) return "Pagamento foi cancelado. Redirecionando..."
    return "Aguardando confirmação do pagamento..."
  }

  if (!externalId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p>Carregando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento PIX</h1>
          <p className="text-gray-600">Aguarde a confirmação do seu pagamento</p>
        </div>

        {/* Status do Pagamento */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">{getPaymentStatusIcon()}</div>
            <CardTitle className="text-lg">{getPaymentStatusTitle()}</CardTitle>
            <CardDescription>{getPaymentStatusDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">External ID:</p>
              <p className="font-mono text-xs bg-gray-100 p-2 rounded">{externalId}</p>
            </div>

            {currentStatus && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status Code:</span>
                  <Badge variant="outline">{currentStatus.status_code}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Valor:</span>
                  <span className="font-bold text-green-600">R$ {currentStatus.amount.toFixed(2)}</span>
                </div>
                {currentStatus.payment_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Data do Pagamento:</span>
                    <span className="text-sm">{new Date(currentStatus.payment_date).toLocaleString("pt-BR")}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status da Conexão Realtime */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {getConnectionIcon()}
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Conexão:</span>
              {getConnectionBadge()}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Tentativas:</span>
              <span className="text-sm">{connectionAttempts}</span>
            </div>
            {lastUpdate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Última atualização:</span>
                <span className="text-sm">{new Date(lastUpdate).toLocaleTimeString("pt-BR")}</span>
              </div>
            )}

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Conexão realtime fechada</strong>
                  <Button onClick={reconnect} variant="outline" size="sm" className="ml-2 bg-transparent">
                    Reconectar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {isConnecting && (
              <Alert className="border-blue-200 bg-blue-50">
                <Activity className="h-4 w-4 animate-spin" />
                <AlertDescription>Reconectando...</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">✅ Sistema em tempo real ativo</p>
              <p className="text-sm text-gray-600">🔔 Você será redirecionado automaticamente</p>
              <p className="text-sm text-gray-600">⚡ Sem necessidade de atualizar a página</p>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === "development" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>External ID: {externalId}</p>
              <p>Connected: {isConnected ? "Yes" : "No"}</p>
              <p>Connecting: {isConnecting ? "Yes" : "No"}</p>
              <p>Error: {error || "None"}</p>
              <p>Current Status: {currentStatus?.status_code || "None"}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
