"use client"

import { useState, useEffect } from "react"
import { Copy, CheckCircle, Clock, Loader2 } from "lucide-react"
import { usePaymentStatus } from "@/hooks/use-payment-status"

interface PaymentDisplayProps {
  token: string
  external_id: string
  qr_code: string
  pix_code: string
  amount: number
  expires_at: string
  onPaymentSuccess: () => void
  onPaymentError: (status: string) => void
  onExpired: () => void
}

export function PaymentDisplay({
  token,
  external_id,
  qr_code,
  pix_code,
  amount,
  expires_at,
  onPaymentSuccess,
  onPaymentError,
  onExpired,
}: PaymentDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")

  // Hook para monitorar status do pagamento
  const { status, loading, error, attempts, maxAttempts } = usePaymentStatus({
    token,
    onPaymentSuccess: (data) => {
      console.log("🎉 Pagamento confirmado!", data)
      onPaymentSuccess()
    },
    onPaymentError: (status) => {
      console.log("❌ Erro no pagamento:", status)
      onPaymentError(status)
    },
    onExpired: () => {
      console.log("⏰ Tempo limite atingido")
      onExpired()
    },
  })

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(expires_at).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft("Expirado")
        clearInterval(interval)
        onExpired()
        return
      }

      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [expires_at, onExpired])

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pix_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Pagamento PIX</h2>
          <p className="text-gray-600">SuperPayBR v4 + Supabase</p>
        </div>

        {/* Status do pagamento */}
        {status?.paid && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Pagamento Confirmado!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">Redirecionando...</p>
          </div>
        )}

        {/* Timer */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Tempo restante: {timeLeft}</span>
          </div>
        </div>

        {/* Valor */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-1">Valor a pagar</p>
          <p className="text-3xl font-bold text-green-600">R$ {amount.toFixed(2)}</p>
          <p className="text-sm text-gray-500">ID: {external_id}</p>
        </div>

        {/* QR Code */}
        <div className="text-center mb-6">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
            <img src={qr_code || "/placeholder.svg"} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
          </div>
          <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
        </div>

        {/* Código PIX */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
          <div className="flex space-x-2">
            <textarea
              value={pix_code}
              readOnly
              className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none"
              rows={3}
            />
            <button
              onClick={copyPixCode}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                copied ? "bg-green-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
        </div>

        {/* Status do monitoramento */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Status do monitoramento:</span>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <div>
              Verificações: {attempts}/{maxAttempts}
            </div>
            <div>Status: {status?.status || "Aguardando"}</div>
            {status?.message && <div>Mensagem: {status.message}</div>}
          </div>

          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
          )}
        </div>

        {/* Instruções */}
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
              1
            </span>
            <span>Abra o app do seu banco</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
              2
            </span>
            <span>Escaneie o QR Code ou cole o código PIX</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
              3
            </span>
            <span>Confirme o pagamento</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
              4
            </span>
            <span>Aguarde a confirmação automática via webhook</span>
          </div>
        </div>
      </div>
    </div>
  )
}
