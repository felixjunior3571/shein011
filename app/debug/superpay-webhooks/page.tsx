"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Zap,
  Database,
  Activity,
  TrendingUp,
  Webhook,
  Play,
  Pause,
} from "lucide-react"

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
  isRefunded?: boolean
  isDenied?: boolean
  isExpired?: boolean
  isCanceled?: boolean
  isCritical?: boolean
  error?: string
  stack?: string
}

interface WebhookStats {
  total_received: number
  processed: number
  payments_confirmed: number
  recent_events: WebhookEvent[]
  recent_webhooks: any[]
}

export default function SuperPayWebhooksDebugPage() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/superpay/webhook", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

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
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    fetchStats()

    if (autoRefresh) {
      const interval = setInterval(fetchStats, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const simulateWebhook = async (statusCode: number, statusName: string) => {
    try {
      const externalId = `SHEIN_ACT_${Date.now()}_test${Math.random().toString(36).substr(2, 9)}`
      const invoiceId = Date.now()
      const amount = 10.0

      console.log(`🧪 Simulando webhook SuperPay - Status ${statusCode}: ${statusName}`)

      const webhookPayload = {
        event: {
          type: "webhook.update",
          date: new Date().toISOString(),
        },
        invoices: {
          id: invoiceId,
          external_id: externalId,
          token: `TOKEN_${Date.now()}`,
          date: new Date().toISOString(),
          status: {
            code: statusCode,
            title: statusName,
            description: `Simulação de ${statusName}`,
            text:
              statusCode === 5
                ? "paid"
                : statusCode === 12
                  ? "denied"
                  : statusCode === 15
                    ? "expired"
                    : statusCode === 6
                      ? "canceled"
                      : statusCode === 9
                        ? "refunded"
                        : "pending",
          },
          customer: 12345,
          prices: {
            total: amount,
            discount: 0,
            taxs: { others: 0 },
            refund: statusCode === 9 ? amount : null,
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
              pix_code: `00020101021226580014br.gov.bcb.pix2536${externalId}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304TEST`,
              qrcode: `https://quickchart.io/qr?text=test&size=200`,
              url: null,
            },
            metadata: { simulated: true },
          },
        },
      }

      const response = await fetch("/api/superpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          gateway: "SUPERPAY",
          userid: "12345",
          id: invoiceId.toString(),
          powered: "superpay",
          webhook: "***TOKEN***",
        },
        body: JSON.stringify(webhookPayload),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Webhook simulado com sucesso:", result)

        // Refresh stats immediately
        setTimeout(fetchStats, 1000)
      } else {
        console.error("❌ Erro ao simular webhook:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("❌ Erro na simulação:", error)
    }
  }

  const getStatusBadge = (event: WebhookEvent) => {
    if (event.type === "webhook_error") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      )
    }

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
          <XCircle className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      )
    }

    if (event.isRefunded) {
      return (
        <Badge className="bg-orange-500">
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SuperPay Webhooks Debug</h1>
            <p className="text-gray-600">Monitoramento em tempo real do sistema de webhooks SuperPay</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {autoRefresh ? "Pausar" : "Iniciar"} Auto-refresh
              </Button>
              <Button onClick={fetchStats} disabled={loading} size="sm" variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <Webhook className="h-8 w-8 text-blue-500 mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_received || 0}</p>
                <p className="text-sm text-gray-600">Webhooks Recebidos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Activity className="h-8 w-8 text-green-500 mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats?.processed || 0}</p>
                <p className="text-sm text-gray-600">Processados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <CheckCircle className="h-8 w-8 text-emerald-500 mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats?.payments_confirmed || 0}</p>
                <p className="text-sm text-gray-600">Pagamentos Confirmados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <TrendingUp className="h-8 w-8 text-purple-500 mr-4" />
              <div>
                <p className="text-2xl font-bold">
                  {stats?.total_received ? Math.round((stats.processed / stats.total_received) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-600">Taxa de Sucesso</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro ao carregar dados:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Last Refresh Info */}
        {lastRefresh && (
          <div className="text-sm text-gray-500 text-center">
            Última atualização: {lastRefresh.toLocaleTimeString()}
            {autoRefresh && " • Auto-refresh ativo (10s)"}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulação de Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Simulação de Webhooks
              </CardTitle>
              <CardDescription>Simule diferentes status de pagamento SuperPay para testar o sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => simulateWebhook(5, "Pago")}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Simular Pago
                </Button>

                <Button onClick={() => simulateWebhook(12, "Pagamento Negado")} variant="destructive" size="sm">
                  <XCircle className="h-4 w-4 mr-2" />
                  Simular Negado
                </Button>

                <Button onClick={() => simulateWebhook(15, "Pagamento Vencido")} variant="secondary" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Simular Vencido
                </Button>

                <Button onClick={() => simulateWebhook(6, "Cancelado")} variant="outline" size="sm">
                  <XCircle className="h-4 w-4 mr-2" />
                  Simular Cancelado
                </Button>

                <Button
                  onClick={() => simulateWebhook(9, "Estornado")}
                  className="bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Simular Estorno
                </Button>

                <Button onClick={() => simulateWebhook(1, "Aguardando Pagamento")} variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Simular Pendente
                </Button>
              </div>

              <Separator />

              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <strong>Status Críticos SuperPay:</strong>
                </p>
                <p>• 5 = Pago (libera produto/serviço)</p>
                <p>• 6 = Cancelado (bloqueia acesso)</p>
                <p>• 9 = Estornado (reverte transação)</p>
                <p>• 12 = Negado (recusa pagamento)</p>
                <p>• 15 = Vencido (expira fatura)</p>
              </div>
            </CardContent>
          </Card>

          {/* Eventos Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Eventos Recentes
              </CardTitle>
              <CardDescription>Últimos eventos processados pelo sistema SuperPay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats?.recent_events && stats.recent_events.length > 0 ? (
                  stats.recent_events.map((event, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(event)}
                          <span className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {event.type === "webhook_error" ? (
                          <div>
                            <p className="text-sm font-medium text-red-600">Erro no Webhook</p>
                            <p className="text-xs text-red-500">{event.error}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium">
                              {event.statusName} - R$ {event.amount?.toFixed(2) || "0.00"}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              ID: {event.externalId?.substring(0, 20)}...
                            </p>
                            {event.payId && <p className="text-xs text-gray-500">Pay ID: {event.payId}</p>}
                          </div>
                        )}
                      </div>

                      {event.isCritical && (
                        <Badge variant="outline" className="ml-2">
                          <Zap className="h-3 w-3 mr-1" />
                          Crítico
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum evento recente</p>
                    <p className="text-xs">Simule um webhook para ver os eventos aqui</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhooks Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Webhooks Processados Recentemente
            </CardTitle>
            <CardDescription>Detalhes dos últimos webhooks recebidos e processados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recent_webhooks && stats.recent_webhooks.length > 0 ? (
                stats.recent_webhooks.map((webhook, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={webhook.processed ? "default" : "secondary"}>
                          {webhook.processed ? "Processado" : "Pendente"}
                        </Badge>
                        <span className="text-sm text-gray-500">{new Date(webhook.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Status: {webhook.status}</p>
                        <p className="text-xs text-gray-500">{webhook.status_name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Invoice ID:</span>
                        <p className="font-mono">{webhook.invoice_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">External ID:</span>
                        <p className="font-mono text-xs">{webhook.external_id?.substring(0, 15)}...</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status Code:</span>
                        <p className="font-bold">{webhook.status}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Processado:</span>
                        <p className={webhook.processed ? "text-green-600" : "text-orange-600"}>
                          {webhook.processed ? "Sim" : "Não"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum webhook processado recentemente</p>
                  <p className="text-xs">Os webhooks aparecerão aqui quando forem recebidos</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Endpoint:</span>
                <p className="font-mono text-xs">/api/superpay/webhook</p>
              </div>
              <div>
                <span className="text-gray-500">Método:</span>
                <p>POST (webhooks), GET (info)</p>
              </div>
              <div>
                <span className="text-gray-500">Storage:</span>
                <p>Memória Global + Supabase</p>
              </div>
              <div>
                <span className="text-gray-500">Rate Limit:</span>
                <p>60 req/min (SuperPay APIs)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
