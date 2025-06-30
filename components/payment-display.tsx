"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePaymentStatus } from "@/hooks/use-payment-status"
import { Copy, Clock, CheckCircle, XCircle } from "lucide-react"

interface PaymentDisplayProps {
  token: string
  qr_code: string
  pix_code: string
  amount: number
  expires_at: string
}

export function PaymentDisplay({ token, qr_code, pix_code, amount, expires_at }: PaymentDisplayProps) {
  const { paymentStatus, loading, error } = usePaymentStatus(token)
  const [timeLeft, setTimeLeft] = useState<string>("")

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(expires_at).getTime()
      const difference = expiry - now

      if (difference > 0) {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`)
      } else {
        setTimeLeft("Expirado")
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expires_at])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("Código copiado!")
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  const getStatusIcon = () => {
    if (!paymentStatus) return <Clock className="w-5 h-5 text-yellow-500" />

    if (paymentStatus.paid) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }

    if (paymentStatus.status !== "pendente") {
      return <XCircle className="w-5 h-5 text-red-500" />
    }

    return <Clock className="w-5 h-5 text-yellow-500" />
  }

  const getStatusMessage = () => {
    if (loading) return "Verificando pagamento..."
    if (error) return `Erro: ${error}`
    if (!paymentStatus) return "Aguardando pagamento..."

    return paymentStatus.message
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Status do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">R$ {amount.toFixed(2)}</p>
            <p className="text-sm text-gray-600">{getStatusMessage()}</p>
            <p className="text-xs text-gray-500">Expira em: {timeLeft}</p>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Card */}
      <Card>
        <CardHeader>
          <CardTitle>QR Code PIX</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="bg-white p-4 rounded-lg inline-block">
            <img src={`data:image/png;base64,${qr_code}`} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
          </div>
          <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
        </CardContent>
      </Card>

      {/* PIX Code Card */}
      <Card>
        <CardHeader>
          <CardTitle>Código PIX</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-gray-100 p-3 rounded text-xs font-mono break-all">{pix_code}</div>
            <Button onClick={() => copyToClipboard(pix_code)} className="w-full" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copiar Código PIX
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                1
              </span>
              <span>Abra o app do seu banco</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                2
              </span>
              <span>Escaneie o QR Code ou cole o código PIX</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                3
              </span>
              <span>Confirme o pagamento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                4
              </span>
              <span>Receba confirmação automática via webhook SuperPay</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
