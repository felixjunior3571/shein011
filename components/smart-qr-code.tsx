"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface SmartQRCodeProps {
  invoiceData: any
  className?: string
}

export function SmartQRCode({ invoiceData, className = "" }: SmartQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log("🔄 Gerando QR Code com QuickChart.io...")

        // Extrair payload PIX dos dados da fatura
        let pixPayload = ""

        if (invoiceData?.payment?.details?.pix_code) {
          pixPayload = invoiceData.payment.details.pix_code
          console.log("✅ Payload PIX encontrado na fatura:", pixPayload.substring(0, 50) + "...")
        } else if (invoiceData?.pix_code) {
          pixPayload = invoiceData.pix_code
          console.log("✅ Payload PIX encontrado (pix_code):", pixPayload.substring(0, 50) + "...")
        } else {
          // Fallback: código PIX de emergência
          pixPayload =
            "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540534.905802BR5925SHEIN CARTAO DE CREDITO6009SAO PAULO62070503***6304"
          console.log("⚠️ Usando código PIX de emergência")
        }

        // Gerar QR Code usando QuickChart.io
        const encodedPayload = encodeURIComponent(pixPayload)
        const qrUrl = `https://quickchart.io/qr?text=${encodedPayload}&size=200&margin=1&format=png`

        console.log("🎯 URL do QR Code gerada:", qrUrl)

        // Testar se a URL funciona
        const testImage = new Image()
        testImage.crossOrigin = "anonymous"

        testImage.onload = () => {
          console.log("✅ QR Code gerado com sucesso via QuickChart.io")
          setQrCodeUrl(qrUrl)
          setIsLoading(false)
        }

        testImage.onerror = () => {
          console.log("❌ Erro ao carregar QR Code do QuickChart.io")
          setError("Erro ao gerar QR Code")
          setIsLoading(false)
        }

        testImage.src = qrUrl

        // Timeout de segurança
        setTimeout(() => {
          if (isLoading) {
            console.log("⏰ Timeout na geração do QR Code")
            setError("Timeout na geração do QR Code")
            setIsLoading(false)
          }
        }, 10000)
      } catch (err) {
        console.error("❌ Erro na geração do QR Code:", err)
        setError("Erro ao gerar QR Code")
        setIsLoading(false)
      }
    }

    if (invoiceData) {
      generateQRCode()
    }
  }, [invoiceData])

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Gerando QR Code...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-50 rounded-lg p-8 ${className}`}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
          <span className="text-red-500 text-2xl">⚠️</span>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={qrCodeUrl || "/placeholder.svg"}
        alt="QR Code PIX"
        className="w-full h-full object-contain"
        style={{ maxWidth: "200px", maxHeight: "200px" }}
      />
    </div>
  )
}
