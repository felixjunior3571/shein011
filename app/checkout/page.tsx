"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useSuperpayPaymentMonitor } from "@/hooks/use-superpay-payment-monitor"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentData, setPaymentData] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Obter dados do pagamento da URL ou localStorage
  const externalId =
    searchParams.get("externalId") || (typeof window !== "undefined" ? localStorage.getItem("currentPaymentId") : null)

  // Monitor de pagamento
  const {
    status,
    isLoading: isMonitoring,
    error,
    checkCount,
    isActive,
  } = useSuperpayPaymentMonitor({
    externalId: externalId || undefined,
    enabled: !!externalId,
    onPaymentConfirmed: (data) => {
      console.log("🎉 Pagamento confirmado! Iniciando redirecionamento...")

      // Salvar dados do pagamento
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "paymentConfirmed",
          JSON.stringify({
            ...data,
            confirmedAt: new Date().toISOString(),
          }),
        )
      }

      // Iniciar countdown
      setCountdown(3)
    },
  })

  // Countdown para redirecionamento
  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      // Redirecionar para /upp/001
      router.push("/upp/001")
    }
  }, [countdown, router])

  // Carregar dados do pagamento
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        // Tentar obter do localStorage primeiro
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("currentPaymentData")
          if (stored) {
            const data = JSON.parse(stored)
            setPaymentData(data)

            // Gerar QR Code se disponível
            if (data.qr_code) {
              setQrCodeUrl(`data:image/svg+xml;base64,${btoa(generateQRCodeSVG(data.qr_code))}`)
            }
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao carregar dados do pagamento:", error)
        setIsLoading(false)
      }
    }

    loadPaymentData()
  }, [])

  // Função para gerar SVG do QR Code (placeholder)
  const generateQRCodeSVG = (qrCode: string) => {
    return `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" textAnchor="middle" fontFamily="Arial" fontSize="12" fill="black">
          QR Code PIX
        </text>
        <text x="100" y="120" textAnchor="middle" fontFamily="Arial" fontSize="8" fill="gray">
          ${qrCode.substring(0, 20)}...
        </text>
      </svg>
    `
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do pagamento...</p>
        </div>
      </div>
    )
  }

  if (!externalId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Pagamento não encontrado</h1>
          <p className="text-gray-600 mb-6">Não foi possível localizar os dados do pagamento.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    )
  }

  // Tela de redirecionamento
  if (countdown !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-green-800 mb-2">Pagamento Confirmado!</h1>
          <p className="text-green-600 mb-6">Seu pagamento foi processado com sucesso.</p>

          <div className="text-4xl font-bold text-green-600 mb-2">{countdown}</div>
          <p className="text-gray-600">
            Redirecionando em {countdown} segundo{countdown !== 1 ? "s" : ""}...
          </p>

          <div className="mt-6">
            <div className="w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Image src="/shein-logo.png" alt="SHEIN" width={120} height={40} className="h-8 w-auto" />
            <div className="text-sm text-gray-600">Checkout Seguro</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Coluna da esquerda - QR Code */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Finalize seu Pagamento</h1>
              <p className="text-gray-600 mb-8">Escaneie o QR Code com seu app do banco</p>

              {/* QR Code */}
              <div className="bg-gray-50 rounded-xl p-8 mb-6">
                {qrCodeUrl ? (
                  <Image
                    src={qrCodeUrl || "/placeholder.svg"}
                    alt="QR Code PIX"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-300 rounded mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">QR Code PIX</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Valor */}
              {paymentData?.amount && (
                <div className="bg-pink-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">Valor a pagar</p>
                  <p className="text-2xl font-bold text-pink-600">
                    R$ {Number(paymentData.amount).toFixed(2).replace(".", ",")}
                  </p>
                </div>
              )}

              {/* Status do monitoramento */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  {isMonitoring ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  ) : (
                    <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
                  )}
                  <span className="text-sm font-medium text-blue-800">
                    {status?.status === "paid" ? "Pagamento Confirmado!" : "Aguardando Pagamento"}
                  </span>
                </div>

                {isActive && (
                  <p className="text-xs text-blue-600">Verificação {checkCount}/120 • Monitoramento ativo</p>
                )}

                {error && <p className="text-xs text-red-600 mt-1">Erro: {error}</p>}
              </div>
            </div>
          </div>

          {/* Coluna da direita - Informações */}
          <div className="space-y-6">
            {/* Instruções */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Como pagar com PIX</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-bold text-pink-600">1</span>
                  </div>
                  <p className="text-gray-600">Abra o app do seu banco</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-bold text-pink-600">2</span>
                  </div>
                  <p className="text-gray-600">Escolha a opção PIX</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-bold text-pink-600">3</span>
                  </div>
                  <p className="text-gray-600">Escaneie o QR Code</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-bold text-pink-600">4</span>
                  </div>
                  <p className="text-gray-600">Confirme o pagamento</p>
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Pagamento Seguro</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-gray-600">Criptografia SSL</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-gray-600">Dados protegidos</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-gray-600">Confirmação automática</span>
                </div>
              </div>
            </div>

            {/* Suporte */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Precisa de ajuda?</h2>
              <p className="text-gray-600 mb-4">
                Nossa equipe está pronta para te ajudar com qualquer dúvida sobre o pagamento.
              </p>
              <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109" />
                </svg>
                Falar no WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
