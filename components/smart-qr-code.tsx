"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react"

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
  const [hasStarted, setHasStarted] = useState(false)

  // Função para gerar QR Code de fallback
  const generateFallbackQRCode = useCallback(
    (pixCode: string): string => {
      if (!pixCode) {
        return "/placeholder.svg?height=200&width=200"
      }
      const encodedPixCode = encodeURIComponent(pixCode)
      return `https://quickchart.io/qr?text=${encodedPixCode}&size=${width}`
    },
    [width],
  )

  // Função para testar se uma URL de imagem é válida
  const testImageUrl = useCallback((url: string, sourceType: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new window.Image()

      const cleanup = () => {
        img.onload = null
        img.onerror = null
      }

      img.onload = () => {
        cleanup()
        console.log(`✅ QR Code carregado com sucesso (${sourceType}):`, url.substring(0, 100))
        resolve(true)
      }

      img.onerror = () => {
        cleanup()
        console.log(`❌ Falha ao carregar QR Code (${sourceType}):`, url.substring(0, 100))
        resolve(false)
      }

      // Timeout de 5 segundos
      setTimeout(() => {
        cleanup()
        console.log(`⏰ Timeout ao carregar QR Code (${sourceType})`)
        resolve(false)
      }, 5000)

      img.src = url
    })
  }, [])

  // Função principal para carregar QR Code
  const loadQRCode = useCallback(async () => {
    if (hasStarted && attempt > 5) {
      console.log("❌ Máximo de tentativas excedido")
      setError("Não foi possível carregar o QR Code")
      setLoading(false)
      return
    }

    setHasStarted(true)
    console.log(`🔄 Tentativa ${attempt}/5 de carregar QR Code`)

    try {
      // Tentativa 1: URL direta do QR Code da fatura
      if (attempt === 1 && invoice.pix.qr_code) {
        console.log("🔄 Tentativa 1: URL direta do QR Code")
        const isValid = await testImageUrl(invoice.pix.qr_code, "direct_qr_code")
        if (isValid) {
          setQrCodeUrl(invoice.pix.qr_code)
          setSource("direct_qr_code")
          setLoading(false)
          return
        }
      }

      // Tentativa 2: URL da imagem da fatura
      if (attempt === 2 && invoice.pix.image) {
        console.log("🔄 Tentativa 2: URL da imagem")
        const isValid = await testImageUrl(invoice.pix.image, "direct_image")
        if (isValid) {
          setQrCodeUrl(invoice.pix.image)
          setSource("direct_image")
          setLoading(false)
          return
        }
      }

      // Tentativa 3: Buscar via API SuperPayBR
      if (attempt === 3) {
        console.log("🔄 Tentativa 3: API SuperPayBR")
        try {
          const response = await fetch(`/api/superpaybr/get-qrcode?invoiceId=${invoice.id}`)
          const data = await response.json()

          if (data.success && data.data) {
            const apiQrCode = data.data.qr_code || data.data.image || data.data.url
            if (apiQrCode) {
              const isValid = await testImageUrl(apiQrCode, "superpaybr_api")
              if (isValid) {
                setQrCodeUrl(apiQrCode)
                setSource("superpaybr_api")
                setLoading(false)
                return
              }
            }
          }
        } catch (error) {
          console.log("❌ Erro na API SuperPayBR:", error)
        }
      }

      // Tentativa 4: Gerar QR Code usando payload PIX
      if (attempt === 4 && invoice.pix.payload) {
        console.log("🔄 Tentativa 4: QR Code gerado via payload")
        const generatedUrl = generateFallbackQRCode(invoice.pix.payload)
        const isValid = await testImageUrl(generatedUrl, "generated_from_payload")
        if (isValid) {
          setQrCodeUrl(generatedUrl)
          setSource("generated_from_payload")
          setLoading(false)
          return
        }
      }

      // Tentativa 5: QR Code de emergência
      if (attempt === 5) {
        console.log("🔄 Tentativa 5: QR Code de emergência")
        const emergencyText = "PIX temporariamente indisponível - Use o código PIX abaixo"
        const emergencyUrl = `https://quickchart.io/qr?text=${encodeURIComponent(emergencyText)}&size=${width}`

        // Para emergência, não testamos - apenas definimos
        setQrCodeUrl(emergencyUrl)
        setSource("emergency")
        setLoading(false)
        return
      }

      // Se chegou aqui, incrementar tentativa
      if (attempt < 5) {
        setTimeout(() => {
          setAttempt((prev) => prev + 1)
        }, 1000)
      }
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error)
      if (attempt < 5) {
        setTimeout(() => {
          setAttempt((prev) => prev + 1)
        }, 1000)
      } else {
        setError("Erro ao carregar QR Code")
        setLoading(false)
      }
    }
  }, [attempt, invoice, testImageUrl, generateFallbackQRCode, width, hasStarted])

  // Efeito para iniciar o carregamento
  useEffect(() => {
    if (!hasStarted) {
      loadQRCode()
    }
  }, [loadQRCode, hasStarted])

  // Efeito para continuar tentativas
  useEffect(() => {
    if (hasStarted && attempt > 1 && attempt <= 5 && loading) {
      loadQRCode()
    }
  }, [attempt, hasStarted, loading, loadQRCode])

  const retry = () => {
    setAttempt(1)
    setHasStarted(false)
    setLoading(true)
    setError(null)
    setQrCodeUrl(null)
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
          if (attempt < 5) {
            setAttempt((prev) => prev + 1)
          } else {
            setError("Erro ao exibir QR Code")
          }
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
