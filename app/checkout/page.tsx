"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"
import { SmartQRCode } from "@/components/smart-qr-code"
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [externalId, setExternalId] = useState<string>("")
  const [qrCode, setQrCode] = useState<string>("")
  const [amount, setAmount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  // Extrair dados da URL ou localStorage
  useEffect(() => {
    const urlExternalId = searchParams.get("external_id")
    const urlQrCode = searchParams.get("qr_code")
    const urlAmount = searchParams.get("amount")

    if (urlExternalId) {
      setExternalId(urlExternalId)
      setQrCode(urlQrCode || "")
      setAmount(Number(urlAmount) || 0)
      setIsLoading(false)
    } else {
      // Tentar recuperar do localStorage
      const storedData = localStorage.getItem("checkout_data")
      if (storedData) {
        try {
          const data = JSON.parse(storedData)
          setExternalId(data.external_id || "")
          setQrCode(data.qr_code || "")
          setAmount(data.amount || 0)
          setIsLoading(false)
        } catch (error) {
          console.error("Erro ao recuperar dados do checkout:", error)
          router.push("/")
        }
      } else {
        router.push("/")
      }
    }
  }, [searchParams, router])

  // Monitor de webhook SuperPay
  const { status, isMonitoring, checkCount, maxChecks, currentInterval, error, progress } = useSuperpayWebhookMonitor({
    externalId,
    onPaymentConfirmed: (status) => {
      console.log("🎉 Pagamento confirmado! Redirecionando...", status)
      // Salvar dados do pagamento
      localStorage.setItem(
        "payment_confirmed",
        JSON.stringify({
          external_id: status.external_id,
          amount: status.amount,
          payment_date: status.payment_date,
          confirmed_at: new Date().toISOString(),
        }),
      )
      // Redirecionar para página de sucesso
      router.push("/upp/001")
    },
    onPaymentDenied: (status) => {
      console.log("❌ Pagamento negado:", status)
      router.push("/payment-denied")
    },
    onPaymentExpired: (status) => {
      console.log("⏰ Pagamento vencido:", status)
      router.push("/payment-expired")
    },
    onPaymentCanceled: (status) => {
      console.log("🚫 Pagamento cancelado:", status)
      router.push("/payment-canceled")
    },
    enabled: !!externalId,
    debug: true,
  })

  const getStatusIcon = () => {
    if (!status) return <Clock className="h-5 w-5 text-blue-500" />

    if (status.is_paid) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status.is_denied) return <XCircle className="h-5 w-5 text-red-500" />
    if (status.is_expired) return <AlertCircle className="h-5 w-5 text-orange-500" />
    if (status.is_canceled) return <XCircle className="h-5 w-5 text-gray-500" />

    return <Clock className="h-5 w-5 text-blue-500" />
  }

  const getStatusColor = () => {
    if (!status) return "bg-blue-50 border-blue-200"

    if (status.is_paid) return "bg-green-50 border-green-200"
    if (status.is_denied) return "bg-red-50 border-red-200"
    if (status.is_expired) return "bg-orange-50 border-orange-200"
    if (status.is_canceled) return "bg-gray-50 border-gray-200"

    return "bg-blue-50 border-blue-200"
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Carregando checkout...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!externalId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold mb-2">Erro no Checkout</h2>
            <p className="text-gray-600 mb-4">Dados do pagamento não encontrados.</p>
            <Button onClick={() => router.push("/")} className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Status Card */}
        <Card className={`border-2 ${getStatusColor()}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon()}
              <div className="flex-1">
                <h2 className="font-semibold text-lg">{status?.status_title || "Aguardando confirmação..."}</h2>
                <p className="text-sm text-gray-600">External ID: {externalId}</p>
              </div>
              <Badge variant={status?.is_paid ? "default" : "secondary"}>{status?.status_code || 1}</Badge>
            </div>

            {/* Progress Bar */}
            {isMonitoring && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Verificações: {checkCount} | Intervalo: {Math.floor(currentInterval / 1000)}s | Nível:{" "}
                    {Math.min(Math.floor(checkCount / 5) + 1, 8)}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 text-center">
                  Última verificação:{" "}
                  {status?.last_check ? new Date(status.last_check).toLocaleTimeString() : "Aguardando..."}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        {qrCode && (
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-4">Escaneie o QR Code PIX</h3>
              <SmartQRCode value={qrCode} size={200} className="mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code com seu app do banco</p>
              {amount > 0 && (
                <div className="text-2xl font-bold text-green-600">R$ {amount.toFixed(2).replace(".", ",")}</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === "development" && status && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 text-sm">Debug Info</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(status, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full" disabled={isMonitoring}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isMonitoring ? "animate-spin" : ""}`} />
            Verificar Agora
          </Button>

          <Button onClick={() => router.push("/")} variant="ghost" className="w-full">
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  )
}
