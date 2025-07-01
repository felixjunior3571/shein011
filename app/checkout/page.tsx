"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useStableRealtimeMonitor } from "@/hooks/use-stable-realtime-monitor"
import Image from "next/image"

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const [externalId, setExternalId] = useState<string>("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [amount, setAmount] = useState<string>("0.28")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")

  // Get external ID from URL params
  useEffect(() => {
    const id = searchParams.get("external_id")
    if (id) {
      setExternalId(id)
      console.log("External ID encontrado:", id)
    }
  }, [searchParams])

  // Use stable realtime monitor
  const { isConnected, paymentConfirmed } = useStableRealtimeMonitor(externalId)

  // Generate QR Code when external ID is available
  useEffect(() => {
    if (!externalId) return

    const generateQRCode = async () => {
      try {
        setIsLoading(true)
        setError("")

        const response = await fetch("/api/superpaybr/get-qrcode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            external_id: externalId,
            amount: Number.parseFloat(amount),
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.success && data.qr_code) {
          setQrCodeUrl(data.qr_code)
          console.log("QR Code gerado com sucesso")
        } else {
          throw new Error(data.error || "Erro ao gerar QR Code")
        }
      } catch (error) {
        console.error("Erro ao gerar QR Code:", error)
        setError(error instanceof Error ? error.message : "Erro desconhecido")
      } finally {
        setIsLoading(false)
      }
    }

    generateQRCode()
  }, [externalId, amount])

  const getConnectionStatus = () => {
    if (paymentConfirmed) {
      return { text: "Pagamento Confirmado! Redirecionando...", color: "text-green-600", icon: "✅" }
    }
    if (isConnected) {
      return { text: "Autenticado - Aguardando API", color: "text-blue-600", icon: "🔐" }
    }
    return { text: "Conectando...", color: "text-yellow-600", icon: "🔄" }
  }

  const status = getConnectionStatus()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Pagamento PIX</h1>

        {/* Status Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm">⏱</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-900">Aguardando confirmação...</p>
              <p className="text-sm text-blue-700">
                External ID: <span className="font-mono">{externalId}</span>
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">1</span>
          </div>

          <div className="mt-3 flex items-center space-x-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="text-sm">{status.icon}</span>
            </div>
            <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            Tentativas: <span className="font-mono">0</span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-2">Valor a pagar</p>
          <p className="text-3xl font-bold text-green-600">R$ {amount}</p>
          <p className="text-sm text-gray-500">Frete PAC - Cartão SHEIN</p>
        </div>

        {/* QR Code Section */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold mb-4">Escaneie o QR Code PIX</h2>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
            {isLoading ? (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Gerando QR Code...</p>
                </div>
              </div>
            ) : error ? (
              <div className="w-64 h-64 flex items-center justify-center bg-red-50 rounded border-2 border-red-200">
                <div className="text-center p-4">
                  <p className="text-red-600 font-medium mb-2">Erro ao gerar QR Code</p>
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              </div>
            ) : qrCodeUrl ? (
              <Image
                src={qrCodeUrl || "/placeholder.svg"}
                alt="QR Code PIX"
                width={256}
                height={256}
                className="rounded"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500">QR Code não disponível</p>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-4">Escaneie o QR Code com seu app do banco</p>
        </div>

        {/* PIX Code Section */}
        {qrCodeUrl && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</p>
            <div className="bg-gray-50 border rounded p-3">
              <p className="text-xs font-mono text-gray-600 break-all">
                {/* This would be the PIX code if available */}
                Código PIX disponível após geração
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
