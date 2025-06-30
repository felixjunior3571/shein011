"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface SmartQRCodeProps {
  qrCodeUrl?: string
  pixCode?: string
  fallbackText?: string
  size?: number
  className?: string
}

export function SmartQRCode({
  qrCodeUrl,
  pixCode,
  fallbackText = "QR Code PIX",
  size = 250,
  className = "",
}: SmartQRCodeProps) {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const generateQRCode = () => {
      setIsLoading(true)
      setHasError(false)

      // Prioridade 1: URL do QR Code fornecida
      if (qrCodeUrl && qrCodeUrl.startsWith("http")) {
        setImageUrl(qrCodeUrl)
        setIsLoading(false)
        return
      }

      // Prioridade 2: Gerar QR Code a partir do código PIX
      if (pixCode) {
        const quickChartUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=${size}&format=png&margin=1`
        setImageUrl(quickChartUrl)
        setIsLoading(false)
        return
      }

      // Prioridade 3: QR Code de placeholder
      const placeholderUrl = `/placeholder.svg?height=${size}&width=${size}&text=${encodeURIComponent(fallbackText)}`
      setImageUrl(placeholderUrl)
      setIsLoading(false)
    }

    generateQRCode()
  }, [qrCodeUrl, pixCode, size, fallbackText])

  const handleImageError = () => {
    console.log("❌ Erro ao carregar QR Code, usando fallback")
    setHasError(true)
    setIsLoading(false)

    // Fallback para placeholder
    const placeholderUrl = `/placeholder.svg?height=${size}&width=${size}&text=${encodeURIComponent("QR Code Indisponível")}`
    setImageUrl(placeholderUrl)
  }

  const handleImageLoad = () => {
    console.log("✅ QR Code carregado com sucesso")
    setIsLoading(false)
    setHasError(false)
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className="relative border-2 border-gray-200 rounded-lg p-4 bg-white"
        style={{ width: size + 32, height: size + 32 }}
      >
        {isLoading && (
          <div
            className="absolute inset-4 flex items-center justify-center bg-gray-100 rounded animate-pulse"
            style={{ width: size, height: size }}
          >
            <div className="text-gray-500 text-sm">Carregando...</div>
          </div>
        )}

        <Image
          src={imageUrl || "/placeholder.svg"}
          alt="QR Code PIX"
          width={size}
          height={size}
          className={`rounded ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          priority
        />

        {hasError && (
          <div className="absolute inset-4 flex items-center justify-center bg-red-50 border border-red-200 rounded">
            <div className="text-red-600 text-sm text-center">
              <div>❌</div>
              <div>QR Code</div>
              <div>Indisponível</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-600 text-center">
        {hasError ? "QR Code temporariamente indisponível" : "Escaneie o QR Code com seu app do banco"}
      </div>
    </div>
  )
}
