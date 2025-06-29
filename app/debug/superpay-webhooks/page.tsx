"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Database, Webhook } from "lucide-react"

interface WebhookEvent {
  type: string
  timestamp: string
  eventType?: string
  statusCode?: number
  statusName?: string
  externalId?: string
  invoiceId?: string | number
  amount?: number
  payId?: string
  isPaid?: boolean
  isDenied?: boolean
  isExpired?: boolean
  isCanceled?: boolean
  isRefunded?: boolean
  isCritical?: boolean
  error?: string
  stack?: string
}

interface WebhookStats {
  total_received: number
  processed: number
  payments_confirmed: number
  recent_events: WebhookEvent[]
  recent_webhooks: Array<{
    timestamp: string
    invoice_id: string | number
    external_id: string
    status: number
    status_name: string
    processed: boolean
  }>
}

export default function SuperPayWebhooksDebugPage() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  const fetchStats = async () => {
    try {
      setError(null)
      const response = await fetch("/api/superpay/webhook")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(
        data.statistics || {
          total_received: 0,
          processed: 0,
          payments_confirmed: 0,
          recent_events: [],
          recent_webhooks: [],
        },
      )
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"))
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  // Simular webhook para testes
  const simulateWebhook = async (statusCode: number) => {
    try {
      const testExternalId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const response = await fetch("/api/superpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          gateway: "SUPERPAY",
        },
        body: JSON.stringify({
          event: {
            type: "webhook.update",
            date: new Date().toISOString(),
          },
          invoices: {
            id: Date.now(),
            external_id: testExternalId,
            token: `TOKEN_${Date.now()}`,
            date: new Date().toISOString(),
            status: {
              code: statusCode,
              title: getStatusName(statusCode),
              description: `Teste de status ${statusCode}`,
              text: getStatusAction(statusCode),
            },
            customer: 12345,
            prices: {
              total: 29.9,
              discount: 0,
              taxs: { others: 0 },
              refund: null,
            },
            type: "pix",
            payment: {
              gateway: "SUPERPAY",
              date: new Date().toISOString(),
              due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              card: null,
              payId: `PAY_${Date.now()}`,
              payDate: statusCode === 5 ? new Date().toISOString() : "",
              details: {
                barcode: null,
                pix_code: "00020101021226580014br.gov.bcb.pix...",
                qrcode: "data:image/png;base64,iVBORw0KGgo...",
                url: null,
              },
              metadata: {},
            },
          },
        }),
      })

      if (response.ok) {
        console.log(`✅ Webhook simulado com sucesso - Status ${statusCode}`)
        // Atualizar estatísticas após 1 segundo
        setTimeout(fetchStats, 1000)
      } else {
        console.error("❌ Erro ao simular webhook:", response.status)
      }
    } catch (error) {
      console.error("❌ Erro na simulação:", error)
    }
  }

  const getStatusName = (code: number): string => {
    const statusMap: Record<number, string> = {
      1: "Aguardando Pagamento",
      5: "Pago",
      6: "Cancelado",
      9: "Estornado",
      12: "Negado",
      15: "Vencido",
    }
    return statusMap[code] || "Desconhecido"
  }

  const getStatusAction = (code: number): string => {
    const actionMap: Record<number, string> = {
      1: "waiting",
      5: "paid",
      6: "canceled",
      9: "refunded",
      12: "denied",
      15: "expired",
    }
    return actionMap[code] || "unknown"
  }

  const getStatusBadge = (event: WebhookEvent) => {
    if (event.isPaid) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      )
    }
    if (event.isDenied) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Negado
        </Badge>
      )
    }
    if (event.isExpired) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Vencido
        </Badge>
      )
    }
    if (event.isCanceled) {
      return (
        <Badge variant="outline">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      )
    }
    if (event.isRefunded) {
      return (
        <Badge variant="secondary">
          <RefreshCw className="h-3 w-3 mr-1" />
          Estornado
        </Badge>
      )
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Aguardando
      </Badge>
    )
  }

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    fetchStats()

    if (autoRefresh) {
      const interval = setInterval(fetchStats, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SuperPay Webhooks Debug</h1>
          <p className="text-gray-600">Monitoramento em tempo real do sistema de webhooks</p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Controles do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <Button onClick={fetchStats} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm">
                  Auto-refresh (10s)
                </label>
              </div>

              {lastUpdate && <span className="text-sm text-gray-500">Última atualização: {lastUpdate}</span>}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h4 className="font-medium">Simular Webhooks (Desenvolvimento):</h4>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => simulateWebhook(5)} size="sm" className="bg-green-600 hover:bg-green-700">
                  Simular Pago (5)
                </Button>
                <Button onClick={() => simulateWebhook(12)} size="sm" variant="destructive">
                  Simular Negado (12)
                </Button>
                <Button onClick={() => simulateWebhook(15)} size="sm" variant="secondary">
                  Simular Vencido (15)
                </Button>
                <Button onClick={() => simulateWebhook(6)} size="sm" variant="outline">
                  Simular Cancelado (6)
                </Button>
                <Button onClick={() => simulateWebhook(9)} size="sm" variant="secondary">
                  Simular Estornado (9)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Recebidos</p>
                  <p className="text-2xl font-bold">{stats?.total_received || 0}</p>
                </div>
                <Webhook className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processados</p>
                  <p className="text-2xl font-bold">{stats?.processed || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagamentos Confirmados</p>
                  <p className="text-2xl font-bold">{stats?.payments_confirmed || 0}</p>
                </div>
                <Database className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold">
                    {stats?.total_received ? Math.round((stats.processed / stats.total_received) * 100) : 0}%
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Recentes</CardTitle>
            <CardDescription>Últimos 10 eventos do sistema de webhooks</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recent_events && stats.recent_events.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_events.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(event)}
                      <div>
                        <p className="font-medium text-sm">
                          {event.type === "webhook_received" ? "Webhook Recebido" : "Erro no Webhook"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.externalId && `ID: ${event.externalId}`}
                          {event.amount && ` • R$ ${event.amount.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString("pt-BR")}</p>
                      {event.isCritical && (
                        <Badge variant="outline" className="text-xs">
                          Crítico
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento recente encontrado</p>
                <p className="text-sm">Webhooks aparecerão aqui quando recebidos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Recentes</CardTitle>
            <CardDescription>Últimos 5 webhooks processados com detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recent_webhooks && stats.recent_webhooks.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_webhooks.map((webhook, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={webhook.processed ? "default" : "secondary"}>
                        {webhook.processed ? "Processado" : "Pendente"}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">Invoice #{webhook.invoice_id}</p>
                        <p className="text-xs text-gray-500 font-mono">{webhook.external_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{webhook.status_name}</p>
                      <p className="text-xs text-gray-500">
                        Status {webhook.status} • {new Date(webhook.timestamp).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum webhook processado ainda</p>
                <p className="text-sm">Use os botões de simulação para testar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Configuração:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Sistema 100% baseado em webhooks</li>
                  <li>• Armazenamento híbrido (Memória + Supabase)</li>
                  <li>• Verificação a cada 3 segundos no frontend</li>
                  <li>• Múltiplas chaves de busca</li>
                  <li>• Auto-refresh do dashboard a cada 10s</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Status Críticos:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Status 5: Pago (redireciona automaticamente)</li>
                  <li>• Status 12: Negado (mostra erro)</li>
                  <li>• Status 15: Vencido (permite novo PIX)</li>
                  <li>• Status 6: Cancelado (mostra cancelamento)</li>
                  <li>• Status 9: Estornado (mostra estorno)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
