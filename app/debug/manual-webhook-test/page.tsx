"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, RefreshCw, Database, Webhook, Eye } from "lucide-react"

interface WebhookResult {
  success: boolean
  message: string
  webhook_response?: any
  webhook_status?: number
  data?: any
  error?: string
}

interface DatabaseResult {
  success: boolean
  data?: any[]
  count?: number
  error?: string
}

export default function ManualWebhookTestPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCheckingDb, setIsCheckingDb] = useState(false)
  const [webhookResult, setWebhookResult] = useState<WebhookResult | null>(null)
  const [databaseResult, setDatabaseResult] = useState<DatabaseResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR")
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  const processWebhook = async () => {
    setIsProcessing(true)
    setWebhookResult(null)
    addLog("🧪 Iniciando processamento manual do webhook...")

    try {
      const response = await fetch("/api/superpay/manual-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      setWebhookResult(result)

      if (result.success) {
        addLog("✅ Webhook processado com sucesso!")
        addLog(`💰 Valor: R$ ${result.webhook_response?.data?.amount || 0}`)
        addLog(`📊 Status: ${result.webhook_response?.data?.status_name || "N/A"}`)
      } else {
        addLog(`❌ Erro no webhook: ${result.error}`)
      }
    } catch (error) {
      addLog(`❌ Erro na requisição: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      setWebhookResult({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        message: "Falha na comunicação com a API",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const checkDatabase = async () => {
    setIsCheckingDb(true)
    setDatabaseResult(null)
    addLog("🔍 Verificando dados no banco...")

    try {
      const response = await fetch("/api/superpaybr/check-database")
      const result = await response.json()
      setDatabaseResult(result)

      if (result.success) {
        addLog(`✅ Banco verificado: ${result.count} registros encontrados`)
        if (result.data && result.data.length > 0) {
          const latest = result.data[0]
          addLog(`📄 Último registro: ${latest.external_id} - R$ ${latest.amount}`)
        }
      } else {
        addLog(`❌ Erro no banco: ${result.error}`)
      }
    } catch (error) {
      addLog(`❌ Erro na verificação: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      setDatabaseResult({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      })
    } finally {
      setIsCheckingDb(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setWebhookResult(null)
    setDatabaseResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Teste Manual de Webhook</h1>
          <p className="text-gray-600">Ferramenta para testar e debugar o processamento de webhooks SuperPay</p>
        </div>

        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4" />
                1. Verificar Banco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={checkDatabase}
                disabled={isCheckingDb}
                className="w-full bg-transparent"
                variant="outline"
              >
                {isCheckingDb ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Verificar Dados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Webhook className="h-4 w-4" />
                2. Processar Webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={processWebhook} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Webhook className="h-4 w-4 mr-2" />
                    Processar Webhook
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4" />
                3. Limpar Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={clearLogs} variant="outline" className="w-full bg-transparent">
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar Tudo
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resultado do Webhook */}
          {webhookResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {webhookResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Resultado do Webhook
                </CardTitle>
                <CardDescription>Status: {webhookResult.success ? "Sucesso" : "Erro"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Badge variant={webhookResult.success ? "default" : "destructive"}>
                      {webhookResult.success ? "✅ Processado" : "❌ Falhou"}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <strong>Mensagem:</strong> {webhookResult.message}
                  </div>

                  {webhookResult.webhook_response && (
                    <div className="space-y-2">
                      <Separator />
                      <div className="text-sm">
                        <strong>Dados Processados:</strong>
                      </div>
                      <div className="bg-gray-100 p-3 rounded text-xs font-mono">
                        <div>External ID: {webhookResult.webhook_response.data?.external_id}</div>
                        <div>Amount: R$ {webhookResult.webhook_response.data?.amount}</div>
                        <div>Status: {webhookResult.webhook_response.data?.status_name}</div>
                        <div>Is Paid: {webhookResult.webhook_response.data?.is_paid ? "✅" : "❌"}</div>
                      </div>
                    </div>
                  )}

                  {webhookResult.error && (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{webhookResult.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado do Banco */}
          {databaseResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {databaseResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Dados do Banco
                </CardTitle>
                <CardDescription>
                  {databaseResult.success ? `${databaseResult.count} registros` : "Erro na consulta"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {databaseResult.success && databaseResult.data && databaseResult.data.length > 0 ? (
                    <div className="space-y-2">
                      {databaseResult.data.slice(0, 3).map((record: any, index: number) => (
                        <div key={index} className="bg-gray-100 p-3 rounded text-sm">
                          <div className="font-medium">{record.external_id}</div>
                          <div className="text-gray-600">
                            R$ {record.amount} - {record.status_title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(record.updated_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : databaseResult.success ? (
                    <div className="text-gray-500 text-sm">Nenhum registro encontrado</div>
                  ) : (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{databaseResult.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📋 Logs de Execução</CardTitle>
              <CardDescription>Acompanhe o processamento em tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>ℹ️ Informações do Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>External ID:</strong> SHEIN_1751350461481_922teqg5i
              </div>
              <div>
                <strong>Valor:</strong> R$ 27,97
              </div>
              <div>
                <strong>Status Code:</strong> 5 (Pago)
              </div>
              <div>
                <strong>Gateway:</strong> SuperPay
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
