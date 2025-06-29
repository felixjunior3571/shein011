"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react"
import { processQRCodeData, logQRCodeEvent, generateFallbackQRCode } from "@/lib/qrcode-utils"

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
  const [attempt, setAttempt] = useState(1)
  const [source, setSource] = useState<string>("unknown")

  useEffect(() => {
    loadQRCode()
  }, [invoice])

  const loadQRCode = async () => {
    setLoading(true)
    setError(null)

    logQRCodeEvent("load_start", {
      invoiceId: invoice.id,
      attempt,
      availableUrls: {
        qr_code: !!invoice.pix.qr_code,
        image: !!invoice.pix.image,
        payload: !!invoice.pix.payload,
      },
    })

    try {
      // Tentativa 1: URL direta do QR Code da fatura
      if (invoice.pix.qr_code && attempt === 1) {
        console.log("🔄 Tentativa 1: URL direta do QR Code")
        await testImageUrl(invoice.pix.qr_code, "direct_qr_code")
        return
      }

      // Tentativa 2: URL da imagem da fatura
      if (invoice.pix.image && attempt <= 2) {
        console.log("🔄 Tentativa 2: URL da imagem")
        await testImageUrl(invoice.pix.image, "direct_image")
        return
      }

      // Tentativa 3: Buscar via API SuperPayBR
      if (attempt <= 3) {
        console.log("🔄 Tentativa 3: API SuperPayBR")
        const response = await fetch(`/api/superpaybr/get-qrcode?invoiceId=${invoice.id}`)
        const data = await response.json()

        if (data.success && data.data) {
          const processed = processQRCodeData(data.data)
          if (processed.qrCodeUrl) {
            await testImageUrl(processed.qrCodeUrl, "superpaybr_api")
            return
          }
        }
      }

      // Tentativa 4: Gerar QR Code usando payload PIX
      if (invoice.pix.payload && attempt <= 4) {
        console.log("🔄 Tentativa 4: QR Code gerado via payload")
        const generatedUrl = generateFallbackQRCode(invoice.pix.payload)
        await testImageUrl(generatedUrl, "generated_from_payload")
        return
      }

      // Tentativa 5: QR Code de emergência
      if (attempt <= 5) {
        console.log("🔄 Tentativa 5: QR Code de emergência")
        const emergencyUrl = `https://quickchart.io/qr?text=${encodeURIComponent("PIX temporariamente indisponível")}&size=${width}`
        await testImageUrl(emergencyUrl, "emergency")
        return
      }

      throw new Error("Todas as tentativas falharam")
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error)
      logQRCodeEvent("load_error", {
        attempt,
        error: error instanceof Error ? error.message : error,
      })

      if (attempt < 5) {
        setAttempt((prev) => prev + 1)
        setTimeout(() => loadQRCode(), 1000 * attempt) // Delay progressivo
      } else {
        setError("Não foi possível carregar o QR Code")
        setLoading(false)
      }
    }
  }

  const testImageUrl = async (url: string, sourceType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()

      img.onload = () => {
        console.log(`✅ QR Code carregado com sucesso (${sourceType}):`, url)
        setQrCodeUrl(url)
        setSource(sourceType)
        setLoading(false)
        logQRCodeEvent("load_success", { url, source: sourceType, attempt })
        resolve()
      }

      img.onerror = () => {
        console.log(`❌ Falha ao carregar QR Code (${sourceType}):`, url)
        logQRCodeEvent("load_failed", { url, source: sourceType, attempt })
        reject(new Error(`Falha ao carregar imagem: ${sourceType}`))
      }

      // Timeout de 10 segundos
      setTimeout(() => {
        reject(new Error(`Timeout ao carregar imagem: ${sourceType}`))
      }, 10000)

      img.src = url
    })
  }

  const retry = () => {
    setAttempt(1)
    loadQRCode()
  }

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-2" />
        <p className="text-sm text-gray-600">Carregando QR Code...</p>
        <p className="text-xs text-gray-500">Tentativa {attempt}/5</p>
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
    <div className={`relative ${className}`}>
      <Image
        src={qrCodeUrl || "/placeholder.svg?height=200&width=200"}
        alt="QR Code PIX"
        width={width}
        height={height}
        className="rounded-lg"
        onError={() => {
          console.log("❌ Erro ao renderizar imagem final")
          setAttempt((prev) => prev + 1)
          loadQRCode()
        }}
      />

      {/* Indicador de fonte */}
      <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
        {source === "direct_qr_code" && "✓ Direto"}
        {source === "direct_image" && "✓ Imagem"}
        {source === "superpaybr_api" && "✓ API"}
        {source === "generated_from_payload" && "↻ Gerado"}
        {source === "emergency" && "⚠ Emergência"}
      </div>

      {/* Indicador de sucesso */}
      {qrCodeUrl && (
        <div className="absolute bottom-1 right-1">
          <CheckCircle className="w-4 h-4 text-green-500 bg-white rounded-full" />
        </div>
      )}
    </div>
  )
}
