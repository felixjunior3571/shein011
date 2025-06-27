"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Bug,
  Eye,
  EyeOff,
  Settings,
  TestTube,
} from "lucide-react"

interface PixData {
  success: boolean
  type: "real" | "simulated"
  externalId: string
  pixCode: string
  qrCode: string
  amount: number
  invoiceId: string
  token: string
  expiresAt: string
  fallback_reason?: string
  debug?: any
}

interface PaymentStatus {
  paid: boolean
  cancelled: boolean
  refunded: boolean
  pending: boolean
  status: {
    code: number
    title: string
    description: string
  }
  amount: number
  invoice_type: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estados principais
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutos
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [sseError, setSseError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [showTests, setShowTests] = useState(false)

  // Parâmetros da URL
  const amount = Number.parseFloat(searchParams.get("amount") || "34.90")
  const shippingMethod = searchParams.get("shipping") || "sedex"

  // Recuperar dados do localStorage com fallback
  const customerData = {
    name: searchParams.get("name") || localStorage.getItem("cardholderName") || "HENRIQUE RODRIGUES LEROY",
    cpf: searchParams.get("cpf") || localStorage.getItem("userCpf") || "055.512.466-55",
    email: searchParams.get("email") || localStorage.getItem("userEmail") || "cidaaamesteves@emailrecebimento.com",
    phone: searchParams.get("phone") || localStorage.getItem("userPhone") || "",
    address: {
      street: searchParams.get("street") || localStorage.getItem("userStreet") || "",
      number: searchParams.get("number") || localStorage.getItem("userNumber") || "",
      district: searchParams.get("district") || localStorage.getItem("userDistrict") || "",
      city: searchParams.get("city") || localStorage.getItem("userCity") || "",
      state: searchParams.get("state") || localStorage.getItem("userState") || "",
      zipcode: searchParams.get("zipcode") || localStorage.getItem("userZipcode") || "",
    },
  }

  // Testar conexão com TryploPay
  const testConnection = useCallback(async () => {
    try {
      setShowTests(true)
      console.log("[CHECKOUT] 🧪 Testando conexão com TryploPay...")

      const response = await fetch("/api/tryplopay/test-connection")
      const data = await response.json()

      setTestResults(data)
      console.log("[CHECKOUT] 📊 Resultados dos testes:", data)
    } catch (error) {
      console.error("[CHECKOUT] ❌ Erro ao testar conexão:", error)
      setTestResults({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        tests: [],
      })
    }
  }, [])

  // Gerar PIX automaticamente
  const generatePix = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setDebugData(null)

      console.log("[CHECKOUT] === INICIANDO GERAÇÃO DE PIX ===")
      console.log("[CHECKOUT] Dados:", { amount, shippingMethod, customerData })

      const requestData = {
        amount,
        customerData,
        shippingMethod,
      }

      console.log("[CHECKOUT] Request data:", requestData)

      const response = await fetch("/api/tryplopay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      console.log("[CHECKOUT] Response status:", response.status)
      console.log("[CHECKOUT] Response headers:", Object.fromEntries(response.headers))

      const responseText = await response.text()
      console.log("[CHECKOUT] Response text (first 500 chars):", responseText.substring(0, 500))

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[CHECKOUT] Erro ao fazer parse da resposta:", parseError)
        throw new Error(`Resposta inválida da API: ${responseText.substring(0, 100)}`)
      }

      console.log("[CHECKOUT] Parsed response:", data)

      // Armazenar dados de debug
      if (data.debug) {
        setDebugData(data.debug)
        console.log("[CHECKOUT] Debug data:", data.debug)
      }

      if (data.success) {
        setPixData(data)
        console.log(`[CHECKOUT] ✅ PIX gerado com sucesso: ${data.type}`)
        console.log("[CHECKOUT] PIX data:", data)

        // Se for PIX simulado, mostrar aviso
        if (data.type === "simulated") {
          console.log("[CHECKOUT] ⚠️ PIX simulado gerado:", data.fallback_reason)
        }
      } else {
        console.error("[CHECKOUT] ❌ Erro na geração do PIX:", data)
        throw new Error(data.error || "Erro desconhecido na geração do PIX")
      }
    } catch (error) {
      console.error("[CHECKOUT] ❌ Erro geral:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [amount, shippingMethod])

  // Conectar aos eventos em tempo real
  useEffect(() => {
    if (!pixData?.externalId) return

    console.log(`[CHECKOUT] === CONECTANDO SSE ===`)
    console.log(`[CHECKOUT] External ID: ${pixData.externalId}`)
    setSseError(null)
    setSseConnected(false)

    const eventSource = new EventSource(`/api/tryplopay/realtime-events?externalId=${pixData.externalId}`)

    eventSource.onopen = () => {
      console.log("[CHECKOUT] ✅ SSE: Conexão aberta com sucesso")
      setSseConnected(true)
      setSseError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("[CHECKOUT] 📨 SSE: Evento recebido:", data)

        switch (data.type) {
          case "connected":
            console.log("[CHECKOUT] 🔗 SSE: Conectado aos eventos em tempo real")
            setSseConnected(true)
            break

          case "status_update":
            console.log("[CHECKOUT] 📊 SSE: Atualização de status:", data)
            setPaymentStatus({
              paid: data.paid,
              cancelled: data.cancelled,
              refunded: data.refunded,
              pending: data.pending,
              status: data.status,
              amount: data.amount,
              invoice_type: data.invoice_type,
            })

            // Redirecionar se pago
            if (data.paid) {
              console.log("[CHECKOUT] 🎉 Pagamento confirmado! Redirecionando...")
              setTimeout(() => {
                router.push(`/success?externalId=${pixData.externalId}&amount=${data.amount}`)
              }, 2000)
            }
            break

          case "final_status":
            console.log(`[CHECKOUT] 🏁 Status final: ${data.final_status}`)
            if (data.final_status === "paid") {
              setTimeout(() => {
                router.push(`/success?externalId=${pixData.externalId}&amount=${data.amount}`)
              }, 2000)
            }
            break

          case "heartbeat":
            console.log(`[CHECKOUT] 💓 SSE: Heartbeat ${data.check}`)
            break

          case "timeout":
            console.log("[CHECKOUT] ⏰ SSE: Timeout da conexão")
            setSseError("Timeout da conexão de eventos")
            break

          case "error":
            console.error("[CHECKOUT] ❌ SSE: Erro:", data.error)
            setSseError(data.error)
            break
        }
      } catch (error) {
        console.error("[CHECKOUT] ❌ Erro ao processar evento SSE:", error)
        setSseError("Erro ao processar evento")
      }
    }

    eventSource.onerror = (error) => {
      console.error("[CHECKOUT] ❌ SSE: Erro na conexão:", error)
      setSseConnected(false)
      setSseError("Erro na conexão de eventos em tempo real")

      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("[CHECKOUT] 🔄 SSE: Tentando reconectar...")
        }
      }, 5000)
    }

    return () => {
      console.log("[CHECKOUT] 🔌 SSE: Desconectando eventos")
      eventSource.close()
      setSseConnected(false)
    }
  }, [pixData?.externalId, router])

  // Timer de expiração
  useEffect(() => {
    if (!pixData || paymentStatus?.paid) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setError("PIX expirado. Gere um novo PIX.")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [pixData, paymentStatus?.paid])

  // Gerar PIX na inicialização
  useEffect(() => {
    generatePix()
  }, [generatePix])

  // Copiar código PIX
  const copyPixCode = async () => {
    if (!pixData?.pixCode) return

    try {
      await navigator.clipboard.writeText(pixData.pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      console.log("[CHECKOUT] 📋 Código PIX copiado")
    } catch (error) {
      console.error("[CHECKOUT] ❌ Erro ao copiar:", error)
    }
  }

  // Verificação manual
  const handleManualCheck = async () => {
    if (!pixData?.externalId) return

    try {
      console.log("[CHECKOUT] 🔍 Verificação manual do pagamento")
      const response = await fetch(`/api/tryplopay/payment-status?externalId=${pixData.externalId}`)
      const data = await response.json()

      console.log("[CHECKOUT] 📊 Status manual:", data)

      if (data.success && data.paid) {
        console.log("[CHECKOUT] ✅ Pagamento confirmado na verificação manual!")
        router.push(`/success?externalId=${pixData.externalId}&amount=${data.amount}`)
      }
    } catch (error) {
      console.error("[CHECKOUT] ❌ Erro na verificação manual:", error)
    }
  }

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Determinar status visual
  const getStatusInfo = () => {
    if (paymentStatus?.paid) {
      return {
        color: "bg-green-500",
        text: "Pagamento Confirmado!",
        icon: <CheckCircle className="w-5 h-5" />,
      }
    }
    if (paymentStatus?.cancelled) {
      return {
        color: "bg-red-500",
        text: "Pagamento Cancelado",
        icon: <AlertCircle className="w-5 h-5" />,
      }
    }
    if (paymentStatus?.refunded) {
      return {
        color: "bg-yellow-500",
        text: "Pagamento Estornado",
        icon: <AlertCircle className="w-5 h-5" />,
      }
    }
    if (timeLeft <= 0) {
      return {
        color: "bg-red-500",
        text: "PIX Expirado",
        icon: <AlertCircle className="w-5 h-5" />,
      }
    }
    return {
      color: "bg-blue-500",
      text: "Aguardando Pagamento",
      icon: <Clock className="w-5 h-5" />,
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">Pagamento PIX</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className={`${statusInfo.color} text-white border-0`}>
                {statusInfo.icon}
                {statusInfo.text}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Botões de Debug e Teste */}
            <div className="flex justify-center gap-2">
              <Button onClick={() => setShowDebug(!showDebug)} variant="outline" size="sm" className="text-xs">
                <Bug className="w-4 h-4 mr-2" />
                {showDebug ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
                Debug
              </Button>
              <Button onClick={testConnection} variant="outline" size="sm" className="text-xs bg-transparent">
                <TestTube className="w-4 h-4 mr-2" />
                Testar API
              </Button>
            </div>

            {/* Resultados dos Testes */}
            {showTests && testResults && (
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono max-h-96 overflow-auto">
                <h3 className="text-yellow-400 font-bold mb-2">🧪 TESTES DE CONECTIVIDADE</h3>

                <div className="mb-3">
                  <h4 className="text-blue-400 font-bold">🔧 Configuração:</h4>
                  <div className="ml-2">
                    <div>Token: {testResults.tryplopay_config?.TRYPLOPAY_TOKEN?.exists ? "✅" : "❌"}</div>
                    <div>API URL: {testResults.tryplopay_config?.TRYPLOPAY_API_URL?.exists ? "✅" : "❌"}</div>
                    <div>Webhook: {testResults.tryplopay_config?.TRYPLOPAY_WEBHOOK_URL?.exists ? "✅" : "❌"}</div>
                  </div>
                </div>

                {testResults.tests?.map((test: any, i: number) => (
                  <div key={i} className="mb-2">
                    <div className="font-bold">
                      {test.status} {test.name}
                    </div>
                    <div className="ml-2 text-gray-300">{test.message}</div>
                    {test.error && <div className="ml-2 text-red-400">Erro: {test.error}</div>}
                  </div>
                ))}

                <Button onClick={() => setShowTests(false)} variant="outline" size="sm" className="mt-2">
                  Fechar Testes
                </Button>
              </div>
            )}

            {/* Debug Panel */}
            {showDebug && (
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono max-h-96 overflow-auto">
                <div className="mb-4">
                  <h3 className="text-yellow-400 font-bold mb-2">🐛 DEBUG COMPLETO</h3>

                  <div className="mb-3">
                    <h4 className="text-blue-400 font-bold">📊 Estados Atuais:</h4>
                    <div className="ml-2">
                      <div>Loading: {loading ? "✅" : "❌"}</div>
                      <div>Error: {error ? "❌" : "✅"}</div>
                      <div>PIX Data: {pixData ? "✅" : "❌"}</div>
                      <div>SSE Connected: {sseConnected ? "✅" : "❌"}</div>
                      <div>SSE Error: {sseError || "Nenhum"}</div>
                      <div>Time Left: {timeLeft}s</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="text-blue-400 font-bold">📝 Dados de Entrada:</h4>
                    <pre className="ml-2 text-xs overflow-auto">
                      {JSON.stringify({ amount, shippingMethod, customerData }, null, 2)}
                    </pre>
                  </div>

                  {debugData && (
                    <div className="mb-3">
                      <h4 className="text-blue-400 font-bold">🔍 Debug da API:</h4>
                      <div className="ml-2">
                        <div>Step: {debugData.step}</div>
                        <div>Errors: {debugData.errors?.length || 0}</div>
                        <div>Warnings: {debugData.warnings?.length || 0}</div>

                        {debugData.errors?.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-red-400 font-bold">❌ Erros:</h5>
                            {debugData.errors.map((err: string, i: number) => (
                              <div key={i} className="ml-2 text-red-300">
                                • {err}
                              </div>
                            ))}
                          </div>
                        )}

                        {debugData.warnings?.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-yellow-400 font-bold">⚠️ Avisos:</h5>
                            {debugData.warnings.map((warn: string, i: number) => (
                              <div key={i} className="ml-2 text-yellow-300">
                                • {warn}
                              </div>
                            ))}
                          </div>
                        )}

                        <details className="mt-2">
                          <summary className="text-cyan-400 cursor-pointer">📋 Dados Completos</summary>
                          <pre className="ml-2 text-xs overflow-auto mt-1">{JSON.stringify(debugData, null, 2)}</pre>
                        </details>
                      </div>
                    </div>
                  )}

                  {pixData && (
                    <div className="mb-3">
                      <h4 className="text-blue-400 font-bold">💳 PIX Gerado:</h4>
                      <div className="ml-2">
                        <div>Type: {pixData.type}</div>
                        <div>External ID: {pixData.externalId}</div>
                        <div>Invoice ID: {pixData.invoiceId}</div>
                        <div>Amount: R$ {pixData.amount}</div>
                        <div>PIX Code Length: {pixData.pixCode?.length || 0}</div>
                        <div>QR Code URL: {pixData.qrCode ? "✅" : "❌"}</div>
                        {pixData.fallback_reason && (
                          <div className="text-yellow-300">Fallback: {pixData.fallback_reason}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentStatus && (
                    <div className="mb-3">
                      <h4 className="text-blue-400 font-bold">💰 Status do Pagamento:</h4>
                      <pre className="ml-2 text-xs overflow-auto">{JSON.stringify(paymentStatus, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status da conexão SSE */}
            {pixData && (
              <div className="text-center">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    sseConnected ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${sseConnected ? "bg-green-500" : "bg-yellow-500"}`} />
                  {sseConnected ? "Monitoramento ativo" : "Conectando..."}
                </div>
                {sseError && <p className="text-red-600 text-xs mt-1">{sseError}</p>}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Gerando PIX...</p>
                <p className="text-gray-500 text-sm mt-1">Conectando com TryploPay</p>
                <div className="mt-4 text-xs text-gray-400">
                  <div>Validando dados...</div>
                  <div>Preparando payload...</div>
                  <div>Enviando para API...</div>
                </div>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Erro na Geração do PIX</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>

                {debugData && debugData.errors?.length > 0 && (
                  <div className="mt-3 p-3 bg-red-100 rounded border">
                    <h4 className="font-medium text-red-800 text-sm">Detalhes técnicos:</h4>
                    <ul className="text-red-700 text-xs mt-1 list-disc list-inside">
                      {debugData.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button onClick={generatePix} className="flex-1 bg-transparent" variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                  </Button>
                  <Button onClick={testConnection} variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* PIX Gerado */}
            {pixData && !loading && !error && (
              <>
                {/* Informações do pagamento */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-bold text-lg">R$ {pixData.amount.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Método:</span>
                    <span className="capitalize">{shippingMethod}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Tipo:</span>
                    <Badge variant={pixData.type === "real" ? "default" : "secondary"}>
                      {pixData.type === "real" ? "PIX Real" : "PIX Simulado"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ID:</span>
                    <span className="text-xs font-mono">{pixData.externalId}</span>
                  </div>
                </div>

                {/* Fallback warning */}
                {pixData.fallback_reason && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Modo Simulado</span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">{pixData.fallback_reason}</p>
                    <p className="text-yellow-600 text-xs mt-2">
                      💡 Configure as variáveis TRYPLOPAY_TOKEN e TRYPLOPAY_API_URL para usar PIX real
                    </p>
                  </div>
                )}

                {/* Timer */}
                {timeLeft > 0 && !paymentStatus?.paid && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatTime(timeLeft)}</div>
                    <p className="text-gray-600 text-sm">Tempo restante</p>
                  </div>
                )}

                {/* QR Code */}
                {!paymentStatus?.paid && timeLeft > 0 && (
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                      <img src={pixData.qrCode || "/placeholder.svg"} alt="QR Code PIX" className="w-64 h-64 mx-auto" />
                    </div>
                    <p className="text-gray-600 text-sm mt-2">Escaneie o QR Code com seu banco</p>
                  </div>
                )}

                {/* Código PIX */}
                {!paymentStatus?.paid && timeLeft > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código PIX ({pixData.pixCode?.length} caracteres):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pixData.pixCode}
                        readOnly
                        className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                      />
                      <Button onClick={copyPixCode} variant={copied ? "default" : "outline"} className="px-4">
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    {copied && <p className="text-green-600 text-sm mt-1">✓ Código copiado!</p>}
                  </div>
                )}

                {/* Botão verificar manualmente */}
                {!paymentStatus?.paid && timeLeft > 0 && (
                  <Button onClick={handleManualCheck} variant="outline" className="w-full bg-transparent">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar Pagamento
                  </Button>
                )}

                {/* Instruções */}
                {!paymentStatus?.paid && timeLeft > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Como pagar:</h3>
                    <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                      <li>Abra o app do seu banco</li>
                      <li>Escolha a opção PIX</li>
                      <li>Escaneie o QR Code ou cole o código</li>
                      <li>Confirme o pagamento</li>
                    </ol>
                  </div>
                )}

                {/* Observação importante */}
                {!paymentStatus?.paid && timeLeft > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>⚠️ Importante:</strong> Após realizar o pagamento, aguarde alguns instantes para a
                      confirmação automática. Você será redirecionado automaticamente.
                    </p>
                  </div>
                )}

                {/* Status de pagamento confirmado */}
                {paymentStatus?.paid && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-green-600 mb-2">Pagamento Confirmado!</h2>
                    <p className="text-gray-600 mb-4">Obrigado pela sua compra!</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 text-sm">Redirecionando para a página de sucesso...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
