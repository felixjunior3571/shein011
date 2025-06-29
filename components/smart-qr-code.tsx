"use client"

import { useState, useEffect } from "react"

interface InvoiceData {
  id: string
  pix: {
    payload: string
    image: string
    qr_code: string
  }
  type: "real" | "simulated" | "emergency"
}

interface SmartQRCodeProps {
  invoice: InvoiceData
  width?: number
  height?: number
  className?: string
}

export function SmartQRCode({ invoice, width = 250, height = 250, className = "" }: SmartQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateQRCode()
  }, [invoice])

  const generateQRCode = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("🔄 Gerando QR Code SuperPayBR...")

      // Usar QuickChart.io diretamente para gerar QR Code limpo
      if (invoice.pix.payload) {
        const quickChartUrl = `https://quickchart.io/qr?text=${encodeURIComponent(invoice.pix.payload)}&size=${width}&margin=1&format=png`

        console.log("✅ QR Code gerado via QuickChart.io:", quickChartUrl)
        setQrCodeUrl(quickChartUrl)
      } else {
        throw new Error("Payload PIX não encontrado")
      }
    } catch (error) {
      console.error("❌ Erro ao gerar QR Code:", error)
      setError("Erro ao gerar QR Code")

      // Fallback para QR Code de emergência
      const emergencyUrl = `https://quickchart.io/qr?text=${encodeURIComponent("00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io")}&size=${width}&margin=1&format=png`
      setQrCodeUrl(emergencyUrl)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ width, height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Gerando QR Code...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-100 rounded-lg ${className}`} style={{ width, height }}>
        <div className="text-center">
          <p className="text-sm text-red-600">Erro ao carregar QR Code</p>
          <button onClick={generateQRCode} className="text-xs text-red-700 underline mt-1">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <img
        src={qrCodeUrl || "/placeholder.svg"}
        alt="QR Code PIX"
        width={width}
        height={height}
        className="rounded-lg"
        onError={() => {
          console.error("❌ Erro ao carregar imagem do QR Code")
          setError("Erro ao carregar QR Code")
        }}
      />
    </div>
  )
}
