"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Database, Webhook, CheckCircle, XCircle, Clock, AlertTriangle, Activity, Zap } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { getAllSuperPayBRConfirmations, getSuperPayBRRealtimeEvents } from "@/lib/superpaybr-payment-storage"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface WebhookRecord {
  id: number
  external_id: string
  invoice_id: string
  status_code: number
  status_name: string
  amount: number
  payment_date: string | null
  processed_at: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  gateway: string
  webhook_data: any
}

interface Stats {
  total: number
  paid: number
  denied: number
  expired: number
  canceled: number
  refunded: number
  pending: number
  memory_count: number
  supabase_count: number
}

export default function SuperPayBRWebhooksDebugPage() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [memoryWebhooks, setMemoryWebhooks] = useState<any[]>([])
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    paid: 0,
    denied: 0,
    expired: 0,
    canceled: 0,
    refunded: 0,
    pending: 0,
    memory_count: 0,
    supabase_count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Carregando webhooks SuperPayBR...")

      // Get from memory
      const memoryConfirmations = getAllSuperPayBRConfirmations()
      const memoryEvents = getSuperPayBRRealtimeEvents()
      setMemoryWebhooks(memoryConfirmations)
      setRealtimeEvents(memoryEvents)

      // Get from Supabase
      const { data: webhookData, error: webhookError } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpaybr")
        .order("processed_at", { ascending: false })
        .limit(50)

      if (webhookError) {
        throw webhookError
      }

      setWebhooks(webhookData || [])

      // Calculate stats
      const supabaseCount = webhookData?.length || 0
      const memoryCount = memoryConfirmations.length
      const totalWebhooks = Math.max(supabaseCount, memoryCount)

      const paidCount =
        (webhookData?.filter((w) => w.is_paid).length || 0) + memoryConfirmations.filter((w) => w.isPaid).length
      const deniedCount =
        (webhookData?.filter((w) => w.is_denied).length || 0) + memoryConfirmations.filter((w) => w.isDenied).length
      const expiredCount =
        (webhookData?.filter((w) => w.is_expired).length || 0) + memoryConfirmations.filter((w) => w.isExpired).length
      const canceledCount =
        (webhookData?.filter((w) => w.is_canceled).length || 0) + memoryConfirmations.filter((w) => w.isCanceled).length
      const refundedCount =
        (webhookData?.filter((w) => w.is_refunded).length || 0) + memoryConfirmations.filter((w) => w.isRefunded).length
      const pendingCount = totalWebhooks - paidCount - deniedCount - expiredCount - canceledCount - refundedCount

      setStats({
        total: totalWebhooks,
        paid: paidCount,
        denied: deniedCount,
        expired: expiredCount,
        canceled: canceledCount,
        refunded: refundedCount,
        pending: Math.max(0, pendingCount),
        memory_count: memoryCount,
        supabase_count: supabaseCount,
      })

      setLastUpdate(new Date().toLocaleTimeString("pt-BR"))
      console.log(`✅ SuperPayBR carregado - Memória: ${memoryCount}, Supabase: ${supabaseCount}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ Erro ao carregar webhooks SuperPayBR:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWebhooks()

    // Auto-refresh every 5 seconds
    const interval = setInterval(loadWebhooks, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (webhook: any) => {
    const isPaid = webhook.is_paid || webhook.isPaid
    const isDenied = webhook.is_denied || webhook.isDenied
    const isExpired = webhook.is_expired || webhook.isExpired
    const isCanceled = webhook.is_canceled || webhook.isCanceled
    const isRefunded = webhook.is_refunded || webhook.isRefunded

    if (isPaid) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (isDenied) return <XCircle className="h-4 w-4 text-red-500" />
    if (isExpired) return <Clock className="h-4 w-4 text-orange-500" />
    if (isCanceled) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (isRefunded) return <RefreshCw className="h-4 w-4 text-blue-500" />
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  const getStatusBadge = (webhook: any) => {
    const isPaid = webhook.is_paid || webhook.isPaid
    const isDenied = webhook.is_denied || webhook.isDenied
    const isExpired = webhook.is_expired || webhook.isExpired
    const isCanceled = webhook.is_canceled || webhook.isCanceled
    const isRefunded = webhook.is_refunded || webhook.isRefunded

    if (isPaid) return <Badge className="bg-green-500">Pago</Badge>
    if (isDenied) return <Badge variant="destructive">Negado</Badge>
    if (isExpired) return <Badge className="bg-orange-500">Vencido</Badge>
    if (isCanceled) return <Badge className="bg-yellow-500">Cancelado</Badge>
    if (isRefunded) return <Badge className="bg-blue-500">Estornado</Badge>
    return <Badge variant="secondary">Pendente</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Debug SuperPayBR Webhooks</h1>
            <p className="text-gray-600">Sistema Híbrido: Memória + Supabase - Monitoramento em tempo real</p>
          </div>
          <Button onClick={loadWebhooks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Status do Sistema SuperPayBR
            </CardTitle>
            <CardDescription>Configuração e conectividade híbrida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <p className="text-sm font-medium">Supabase</p>
                <p className="text-xs text-gray-500">Conectado</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">🔔</div>
                <p className="text-sm font-medium">Webhooks</p>
                <p className="text-xs text-gray-500">Ativo</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">⚡</div>
                <p className="text-sm font-medium">Memória</p>
                <p className="text-xs text-gray-500">{stats.memory_count} registros</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">💾</div>
                <p className="text-sm font-medium">Supabase</p>
                <p className="text-xs text-gray-500">{stats.supabase_count} registros</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">🔄</div>
                <p className="text-sm font-medium">Última Atualização</p>
                <p className="text-xs text-gray-500">{lastUpdate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
              <p className="text-sm text-gray-600">Pagos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
              <p className="text-sm text-gray-600">Negados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
              <p className="text-sm text-gray-600">Vencidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.canceled}</div>
              <p className="text-sm text-gray-600">Cancelados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.refunded}</div>
              <p className="text-sm text-gray-600">Estornados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
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

        {/* Realtime Events */}
        {realtimeEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Eventos em Tempo Real (Memória)
              </CardTitle>
              <CardDescription>Últimos {realtimeEvents.length} eventos processados na memória</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {realtimeEvents.slice(0, 10).map((event, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">⚡</span>
                      <span className="font-medium">{event.data.externalId}</span>
                      <span className="text-gray-500">→</span>
                      <span className={event.data.isPaid ? "text-green-600" : "text-gray-600"}>
                        {event.data.statusName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Memory Webhooks */}
        {memoryWebhooks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Webhooks na Memória SuperPayBR
              </CardTitle>
              <CardDescription>Confirmações armazenadas na memória (acesso instantâneo)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {memoryWebhooks.slice(0, 20).map((webhook, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(webhook)}
                        <span className="font-medium">{webhook.externalId}</span>
                        {getStatusBadge(webhook)}
                        <Badge variant="outline" className="text-xs">
                          MEMÓRIA
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(webhook.receivedAt).toLocaleString("pt-BR")}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Invoice ID:</span>
                        <p className="font-mono text-xs">{webhook.invoiceId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status Code:</span>
                        <p className="font-bold">{webhook.statusCode}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Valor:</span>
                        <p className="font-bold text-green-600">R$ {webhook.amount?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gateway:</span>
                        <p className="uppercase font-medium">SuperPayBR</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supabase Webhooks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks Supabase SuperPayBR
            </CardTitle>
            <CardDescription>Últimos 50 webhooks persistidos no Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando webhooks...</span>
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum webhook SuperPayBR encontrado no Supabase</p>
                <p className="text-sm">Os webhooks aparecerão aqui quando forem recebidos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(webhook)}
                        <span className="font-medium">{webhook.external_id}</span>
                        {getStatusBadge(webhook)}
                        <Badge variant="outline" className="text-xs">
                          SUPABASE
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(webhook.processed_at).toLocaleString("pt-BR")}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Invoice ID:</span>
                        <p className="font-mono text-xs">{webhook.invoice_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status Code:</span>
                        <p className="font-bold">{webhook.status_code}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Valor:</span>
                        <p className="font-bold text-green-600">R$ {webhook.amount?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gateway:</span>
                        <p className="uppercase font-medium">{webhook.gateway}</p>
                      </div>
                    </div>

                    {webhook.payment_date && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Data do Pagamento:</span>
                        <span className="ml-2 font-medium">
                          {new Date(webhook.payment_date).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}

                    <Separator className="my-2" />

                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        Ver dados do webhook
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(webhook.webhook_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Técnicas SuperPayBR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Configuração SuperPayBR:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>
                    • Webhook Endpoint: <code>/api/superpaybr/webhook</code>
                  </li>
                  <li>
                    • Status API: <code>/api/superpaybr/payment-status</code>
                  </li>
                  <li>
                    • Gateway: <code>superpaybr</code>
                  </li>
                  <li>
                    • Armazenamento: <strong>Memória + Supabase</strong>
                  </li>
                  <li>
                    • Verificação: <strong>3 segundos</strong>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Status Codes SuperPayBR:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>
                    • <strong>5</strong>: Pagamento Confirmado! (crítico)
                  </li>
                  <li>
                    • <strong>12</strong>: Negado (crítico)
                  </li>
                  <li>
                    • <strong>15</strong>: Vencido (crítico)
                  </li>
                  <li>
                    • <strong>6</strong>: Cancelado (crítico)
                  </li>
                  <li>
                    • <strong>9</strong>: Estornado (crítico)
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.memory_count}</div>
                <p className="text-sm text-gray-600">Registros em Memória</p>
                <p className="text-xs text-gray-500">Acesso instantâneo</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">{stats.supabase_count}</div>
                <p className="text-sm text-gray-600">Registros no Supabase</p>
                <p className="text-xs text-gray-500">Persistência garantida</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{realtimeEvents.length}</div>
                <p className="text-sm text-gray-600">Eventos em Tempo Real</p>
                <p className="text-xs text-gray-500">Últimos 100 eventos</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.memory_count > 0 ? "⚡" : "💤"}</div>
                <p className="text-sm text-gray-600">Status do Sistema</p>
                <p className="text-xs text-gray-500">{stats.memory_count > 0 ? "Ativo" : "Aguardando"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
