"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Play, RefreshCw, Database, Zap } from "lucide-react"

export default function ManualWebhookTestPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingDB, setIsCheckingDB] = useState(false)
  const [dbStatus, setDbStatus] = useState<any>(null)

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

  const checkDatabaseStatus = async () => {
    setIsCheckingDB(true)
    setDbStatus(null)

    try {
      console.log("🔍 Verificando status do banco...")

      // Verificar se a tabela existe e tem dados
      const response = await fetch("/api/superpaybr/payment-status?external_id=SHEIN_1751349759845_i6qouytzp", {
        method: "GET",
      })

      const data = await response.json()
      setDbStatus(data)
      console.log("📊 Status do banco:", data)
    } catch (error) {
      console.error("❌ Erro ao verificar banco:", error)
      setDbStatus({ error: "Erro ao verificar banco de dados" })
    } finally {
      setIsCheckingDB(false)
    }
  }

  const testRealtimeConnection = async () => {
    try {
      console.log("📡 Testando conexão Realtime...")

      // Simular um teste de conexão
      const testData = {
        external_id: "SHEIN_1751349759845_i6qouytzp",
        test: true,
        timestamp: new Date().toISOString(),
      }

      console.log("🧪 Dados de teste Realtime:", testData)
      alert("Verifique o console para logs do teste Realtime")
    } catch (error) {
      console.error("❌ Erro no teste Realtime:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Teste Manual de Webhook SuperPay</h1>
          <p className="text-gray-600">Processar manualmente o webhook que falhou e verificar o sistema</p>
        </div>

        {/* Status do Problema */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">❌ Problemas Identificados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro 1:</strong> "Could not find the 'barcode' column" - Tabela do banco incompleta
              </AlertDescription>
            </Alert>
            <Alert className="border-yellow-200 bg-yellow-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro 2:</strong> Amount mostrando 0 em vez de R$ 27,97 - Processamento incorreto
              </AlertDescription>
            </Alert>
            <div className="text-sm text-gray-600">
              <p>
                <strong>External ID:</strong> <code>SHEIN_1751349759845_i6qouytzp</code>
              </p>
              <p>
                <strong>Status Code:</strong> 5 (Pagamento Confirmado)
              </p>
              <p>
                <strong>Valor Real:</strong> R$ 27,97
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ações de Correção */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Ações de Correção</CardTitle>
            <CardDescription>Execute estas ações na ordem para corrigir o sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={checkDatabaseStatus}
                disabled={isCheckingDB}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center bg-transparent"
              >
                {isCheckingDB ? (
                  <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                ) : (
                  <Database className="h-5 w-5 mb-2" />
                )}
                <span className="text-sm">1. Verificar Banco</span>
              </Button>

              <Button
                onClick={processManualWebhook}
                disabled={isProcessing}
                className="h-20 flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? <RefreshCw className="h-5 w-5 animate-spin mb-2" /> : <Play className="h-5 w-5 mb-2" />}
                <span className="text-sm">2. Processar Webhook</span>
              </Button>

              <Button
                onClick={testRealtimeConnection}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center bg-transparent"
              >
                <Zap className="h-5 w-5 mb-2" />
                <span className="text-sm">3. Testar Realtime</span>
              </Button>
            </div>

            {(isProcessing || isCheckingDB) && (
              <div className="text-center text-blue-600 py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">
                  {isProcessing && "Processando webhook..."}
                  {isCheckingDB && "Verificando banco de dados..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status do Banco */}
        {dbStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Status do Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(dbStatus, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        {/* Resultado do Webhook */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />✅ Webhook Processado com Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Status HTTP:</span>
                    <Badge className="ml-2 bg-green-500">{result.webhook_status}</Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">External ID:</span>
                    <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                      {result.processed_data?.external_id}
                    </code>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Valor:</span>
                    <span className="ml-2 font-bold text-green-600">R$ {result.processed_data?.amount}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status:</span>
                    <Badge className="ml-2 bg-green-500">{result.processed_data?.is_paid ? "PAGO" : "PENDENTE"}</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Resposta Completa:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />❌ Erro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erro:</strong> {error}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Instruções de Correção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="space-y-2">
              <p>
                <strong>1. Execute o SQL Script:</strong>
              </p>
              <code className="block bg-gray-100 p-2 rounded text-xs">scripts/fix-payment-webhooks-table.sql</code>
              <p className="text-xs text-gray-500">Este script recria a tabela com todas as colunas necessárias</p>
            </div>

            <div className="space-y-2">
              <p>
                <strong>2. Teste o Webhook Manual:</strong>
              </p>
              <p className="text-xs text-gray-500">Clique no botão "Processar Webhook" para reprocessar o pagamento</p>
            </div>

            <div className="space-y-2">
              <p>
                <strong>3. Verifique o Realtime:</strong>
              </p>
              <p className="text-xs text-gray-500">Acesse /checkout para ver se o sistema detecta o pagamento</p>
            </div>

            <div className="space-y-2">
              <p>
                <strong>4. Resultado Esperado:</strong>
              </p>
              <p className="text-xs text-gray-500">
                Redirecionamento automático para /upp/001 quando o pagamento for detectado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
