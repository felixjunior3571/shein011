"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Database, Webhook, Activity } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface WebhookRecord {
  id: number
  external_id: string
  invoice_id: string
  status_code: number
  status_title: string
  amount: number
  payment_date: string | null
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  processed_at: string
  webhook_data: any
  gateway: string
}

interface ConnectionTest {
  success: boolean
  message: string
  error?: string
  working_config?: any
  all_results?: any[]
}

export default function SuperPayWebhooksDebugPage() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionTest, setConnectionTest] = useState<ConnectionTest | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)

  useEffect(() => {
    loadWebhooks()
    testConnection()
  }, [])

  const loadWebhooks = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("🔍 Carregando webhooks do Supabase...")

      const { data, error: supabaseError } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpaybr")
        .order("processed_at", { ascending: false })
        .limit(20)

      if (supabaseError) {
        throw supabaseError
      }

      setWebhooks(data || [])
      console.log(`✅ ${data?.length || 0} webhooks carregados`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ Erro ao carregar webhooks:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    try {
      setIsTestingConnection(true)
      console.log("🔍 Testando conexão SuperPayBR...")

      const response = await fetch("/api/superpaybr/test-connection")
      const data = await response.json()

      setConnectionTest(data)
      console.log("📊 Resultado do teste:", data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setConnectionTest({
        success: false,
        error: "Erro na conexão",
        message: errorMessage,
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const simulatePayment = async () => {
    try {
      setIsSimulating(true)
      const externalId = `SHEIN_${Date.now()}_test`

      console.log("🧪 Simulando pagamento:", externalId)

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          status_code: 5,
          amount: 27.97,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Pagamento simulado com sucesso!\nExternal ID: ${externalId}`)
        loadWebhooks()
      } else {
        alert(`❌ Erro na simulação: ${data.message}`)
      }
    } catch (err) {
      alert(`❌ Erro na simulação: ${err}`)
    } finally {
      setIsSimulating(false)
    }
  }

  const getStatusIcon = (webhook: WebhookRecord) => {
    if (webhook.is_paid) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (webhook.is_denied) return <XCircle className="h-4 w-4 text-red-500" />
    if (webhook.is_expired) return <AlertCircle className="h-4 w-4 text-orange-500" />
    if (webhook.is_canceled) return <XCircle className="h-4 w-4 text-gray-500" />
    if (webhook.is_refunded) return <RefreshCw className="h-4 w-4 text-blue-500" />
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  const getStatusBadge = (webhook: WebhookRecord) => {
    if (webhook.is_paid) return <Badge className="bg-green-500 text-white">Pago</Badge>
    if (webhook.is_denied) return <Badge variant="destructive">Negado</Badge>
    if (webhook.is_expired) return <Badge className="bg-orange-500 text-white">Vencido</Badge>
    if (webhook.is_canceled) return <Badge variant="secondary">Cancelado</Badge>
    if (webhook.is_refunded) return <Badge className="bg-blue-500 text-white">Estornado</Badge>
    return <Badge variant="outline">Pendente</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug SuperPay Webhooks</h1>
          <p className="text-gray-600">Sistema completo de monitoramento e debug</p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Status da Conexão SuperPayBR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testConnection} disabled={isTestingConnection} className="flex-1">
                {isTestingConnection ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Testar Conexão
              </Button>
              <Button
                onClick={simulatePayment}
                disabled={isSimulating}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                {isSimulating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Webhook className="h-4 w-4 mr-2" />
                )}
                Simular Pagamento
              </Button>
            </div>

            {connectionTest && (
              <Alert className={connectionTest.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {connectionTest.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>
                    <strong>{connectionTest.success ? "✅ Sucesso:" : "❌ Erro:"}</strong> {connectionTest.message}
                  </AlertDescription>
                </div>

                {connectionTest.working_config && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">Ver configuração funcionando</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                      {JSON.stringify(connectionTest.working_config, null, 2)}
                    </pre>
                  </details>
                )}

                {connectionTest.all_results && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">Ver todos os testes</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(connectionTest.all_results, null, 2)}
                    </pre>
                  </details>
                )}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{webhooks.length}</div>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{webhooks.filter((w) => w.is_paid).length}</div>
              <p className="text-sm text-gray-600">Pagos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{webhooks.filter((w) => w.is_denied).length}</div>
              <p className="text-sm text-gray-600">Negados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{webhooks.filter((w) => w.is_expired).length}</div>
              <p className="text-sm text-gray-600">Vencidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {
                  webhooks.filter(
                    (w) => !w.is_paid && !w.is_denied && !w.is_expired && !w.is_canceled && !w.is_refunded,
                  ).length
                }
              </div>
              <p className="text-sm text-gray-600">Pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Webhooks List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks Recebidos ({webhooks.length})
              </CardTitle>
              <Button onClick={loadWebhooks} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Carregando webhooks...</p>
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8">
                <Webhook className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Nenhum webhook recebido ainda</p>
                <p className="text-sm text-gray-500 mt-2">Use o botão "Simular Pagamento" para testar o sistema</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(webhook)}
                        <div>
                          <h3 className="font-medium text-gray-900">{webhook.external_id}</h3>
                          <p className="text-sm text-gray-500">Invoice: {webhook.invoice_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(webhook)}
                        <span className="text-lg font-bold text-green-600">
                          R$ {webhook.amount?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Status Code:</span>
                        <div className="font-medium">{webhook.status_code}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Data Pagamento:</span>
                        <div className="font-medium">
                          {webhook.payment_date
                            ? new Date(webhook.payment_date).toLocaleString("pt-BR")
                            : "Não informado"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Processado:</span>
                        <div className="font-medium">{new Date(webhook.processed_at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Gateway:</span>
                        <div className="font-medium uppercase">{webhook.gateway}</div>
                      </div>
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        Ver dados completos do webhook
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto max-h-60">
                        {JSON.stringify(webhook.webhook_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções e Status Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Como usar:</h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Execute o script SQL no Supabase</li>
                  <li>Configure as variáveis de ambiente</li>
                  <li>Teste a conexão com SuperPayBR</li>
                  <li>Simule um pagamento para testar</li>
                  <li>Monitore os webhooks em tempo real</li>
                </ol>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Status Codes SuperPayBR:</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>1 - Aguardando:</span>
                    <Badge variant="outline">Pendente</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>5 - Pago:</span>
                    <Badge className="bg-green-500 text-white">Redireciona</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>6 - Cancelado:</span>
                    <Badge variant="secondary">Final</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>9 - Estornado:</span>
                    <Badge className="bg-blue-500 text-white">Final</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>12 - Negado:</span>
                    <Badge variant="destructive">Final</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>15 - Vencido:</span>
                    <Badge className="bg-orange-500 text-white">Final</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
