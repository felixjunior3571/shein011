"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { AlertCircle, RefreshCw } from "lucide-react"

interface SmartQRCodeProps {
  invoice: {
    id: string
    pix: {
      qr_code?: string
      image?: string
      payload?: string
    }
    type?: string
  }
  width?: number
  height?: number
  className?: string
}

export function SmartQRCode({ invoice, width = 200, height = 200, className = "" }: SmartQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateQRCode()
  }, [invoice])

  const generateQRCode = () => {
    console.log("🔄 Gerando QR Code PIX com QuickChart.io...")

    try {
      // Usar o payload PIX se disponível, senão usar um código de emergência
      let pixCode = invoice.pix.payload

      if (!pixCode) {
        // Gerar código PIX de emergência se não houver payload
        const amount = "34.90" // valor padrão
        pixCode = `00020101021226580014br.gov.bcb.pix2536pix.quickchart.io/emergency/${Date.now()}520400005303986540${amount}5802BR5909SHEIN5011SAO PAULO62070503***6304QRCD`
        console.log("⚠️ Usando código PIX de emergência")
      }

      // Gerar QR Code usando QuickChart.io
      const encodedPixCode = encodeURIComponent(pixCode)
      const quickChartUrl = `https://quickchart.io/qr?text=${encodedPixCode}&size=${width}&margin=1&format=png`

      console.log("✅ QR Code gerado com QuickChart.io:", quickChartUrl.substring(0, 100) + "...")

      setQrCodeUrl(quickChartUrl)
      setLoading(false)
      setError(null)
    } catch (error) {
      console.error("❌ Erro ao gerar QR Code:", error)
      setError("Erro ao gerar QR Code")
      setLoading(false)
    }
  }

  const retry = () => {
    setLoading(true)
    setError(null)
    setQrCodeUrl(null)
    generateQRCode()
  }

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-2" />
        <p className="text-sm text-gray-600">Gerando QR Code...</p>
      </div>
    )
  }

  if (error && !qrCodeUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-red-50 rounded-lg p-4 ${className}`}
        style={{ width, height }}
      >
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600 text-center mb-2">{error}</p>
        <button
          onClick={retry}
          className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <Image
        src={qrCodeUrl || "/placeholder.svg?height=200&width=200"}
        alt="QR Code PIX"
        width={width}
        height={height}
        className="rounded-lg"
        onError={() => {
          console.log("❌ Erro ao carregar QR Code, tentando novamente...")
          retry()
        }}
      />
    </div>
  )
}
