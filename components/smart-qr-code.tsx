"use client"

import { useState } from "react"
import Image from "next/image"

interface SmartQRCodeProps {
  qrCodeUrl?: string | null
  pixCode?: string | null
  size?: number
  className?: string
}

export function SmartQRCode({ qrCodeUrl, pixCode, size = 200, className = "" }: SmartQRCodeProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Gerar QR Code usando QuickChart.io se não tiver URL
  const getQRCodeUrl = () => {
    if (qrCodeUrl && !imageError) {
      return qrCodeUrl
    }

    if (pixCode) {
      return `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=${size}&margin=1&format=png`
    }

    // Fallback para placeholder
    return `/placeholder.svg?height=${size}&width=${size}`
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    console.log("❌ Erro ao carregar QR Code, usando fallback")
    setImageError(true)
    setIsLoading(false)
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg"
          style={{ width: size, height: size }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        </div>
      )}

      <Image
        src={getQRCodeUrl() || "/placeholder.svg"}
        alt="QR Code PIX"
        width={size}
        height={size}
        className={`rounded-lg border-2 border-gray-200 ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        priority
      />

      {imageError && pixCode && (
        <div className="absolute bottom-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-xs p-1 rounded-b-lg">
          ⚠️ Usando QR Code de fallback
        </div>
      )}
    </div>
  )
}
