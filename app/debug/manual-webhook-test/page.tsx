"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Play, RefreshCw } from "lucide-react"

export default function ManualWebhookTestPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const processManualWebhook = async () => {
    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      console.log("🔧 Processando webhook manual...")

      const response = await fetch("/api/superpaybr/manual-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        console.log("✅ Webhook manual processado:", data)
      } else {
        setError(data.message || "Erro no processamento")
        console.error("❌ Erro no webhook manual:", data)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setError(errorMessage)
      console.error("❌ Erro na requisição:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const checkSupabaseConnection = async () => {
    try {
      const response = await fetch("/api/superpaybr/webhook", {
        method: "GET",
      })
      const data = await response.json()
      console.log("🔍 Status do webhook endpoint:", data)
    } catch (error) {
      console.error("❌ Erro ao verificar endpoint:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teste Manual de Webhook</h1>
          <p className="text-gray-600">Processar manualmente o webhook que falhou</p>
        </div>

        {/* Dados do Webhook */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Recebido (Falhou)</CardTitle>
            <CardDescription>
              External ID: <code className="bg-gray-100 px-2 py-1 rounded">SHEIN_1751349018795_90tml3wif</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Status Code:</span>
                <Badge className="ml-2 bg-green-500">5 (Pago)</Badge>
              </div>
              <div>
                <span className="text-sm text-gray-500">Valor:</span>
                <span className="ml-2 font-bold text-green-600">R$ 27,97</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Data:</span>
                <span className="ml-2">01/07/2025 02:52:05</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Gateway:</span>
                <span className="ml-2">SuperPay</span>
              </div>
            </div>

            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro original:</strong> "Invalid API key" - O webhook falhou devido a problema na chave do
                Supabase
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Button onClick={processManualWebhook} disabled={isProcessing} className="flex-1">
                {isProcessing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Processar Webhook Manualmente
              </Button>

              <Button onClick={checkSupabaseConnection} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Conexão
              </Button>
            </div>

            {isProcessing && (
              <div className="text-center text-blue-600">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Processando webhook...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultado */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Webhook Processado com Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Status HTTP:</span>
                    <Badge className="ml-2 bg-green-500">{result.webhook_status}</Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Processado em:</span>
                    <span className="ml-2">{new Date().toLocaleTimeString("pt-BR")}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Resposta do Webhook:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.webhook_response, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>
              1. <strong>Clique em "Processar Webhook Manualmente"</strong> para reprocessar o pagamento
            </p>
            <p>
              2. <strong>Verifique os logs</strong> no console do navegador
            </p>
            <p>
              3. <strong>Acesse a página de checkout</strong> para ver se o status foi atualizado
            </p>
            <p>
              4. <strong>O sistema deve redirecionar automaticamente</strong> para /upp/001
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
