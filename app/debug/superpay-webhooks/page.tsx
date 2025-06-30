"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Database, Webhook, CheckCircle, XCircle, Clock, AlertTriangle, Activity } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

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
}

export default function SuperPayWebhooksDebugPage() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    paid: 0,
    denied: 0,
    expired: 0,
    canceled: 0,
    refunded: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Carregando webhooks SuperPay do Supabase...")

      // Get recent webhooks
      const { data: webhookData, error: webhookError } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpay")
        .order("processed_at", { ascending: false })
        .limit(50)

      if (webhookError) {
        throw webhookError
      }

      setWebhooks(webhookData || [])

      // Calculate stats
      const totalWebhooks = webhookData?.length || 0
      const paidCount = webhookData?.filter((w) => w.is_paid).length || 0
      const deniedCount = webhookData?.filter((w) => w.is_denied).length || 0
      const expiredCount = webhookData?.filter((w) => w.is_expired).length || 0
      const canceledCount = webhookData?.filter((w) => w.is_canceled).length || 0
      const refundedCount = webhookData?.filter((w) => w.is_refunded).length || 0
      const pendingCount = totalWebhooks - paidCount - deniedCount - expiredCount - canceledCount - refundedCount

      setStats({
        total: totalWebhooks,
        paid: paidCount,
        denied: deniedCount,
        expired: expiredCount,
        canceled: canceledCount,
        refunded: refundedCount,
        pending: pendingCount,
      })

      setLastUpdate(new Date().toLocaleTimeString("pt-BR"))
      console.log(`✅ ${totalWebhooks} webhooks SuperPay carregados do Supabase`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ Erro ao carregar webhooks SuperPay:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWebhooks()

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadWebhooks, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (webhook: WebhookRecord) => {
    if (webhook.is_paid) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (webhook.is_denied) return <XCircle className="h-4 w-4 text-red-500" />
    if (webhook.is_expired) return <Clock className="h-4 w-4 text-orange-500" />
    if (webhook.is_canceled) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (webhook.is_refunded) return <RefreshCw className="h-4 w-4 text-blue-500" />
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  const getStatusBadge = (webhook: WebhookRecord) => {
    if (webhook.is_paid) return <Badge className="bg-green-500">Pago</Badge>
    if (webhook.is_denied) return <Badge variant="destructive">Negado</Badge>
    if (webhook.is_expired) return <Badge className="bg-orange-500">Vencido</Badge>
    if (webhook.is_canceled) return <Badge className="bg-yellow-500">Cancelado</Badge>
    if (webhook.is_refunded) return <Badge className="bg-blue-500">Estornado</Badge>
    return <Badge variant="secondary">Pendente</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Debug SuperPay Webhooks</h1>
            <p className="text-gray-600">Sistema 100% Supabase - Monitoramento em tempo real</p>
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
              Status do Sistema SuperPay
            </CardTitle>
            <CardDescription>Configuração e conectividade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm font-medium">API Status</p>
                <p className="text-xs text-gray-500">Operacional</p>
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

        {/* Webhooks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks Recentes SuperPay
            </CardTitle>
            <CardDescription>Últimos 50 webhooks processados (armazenamento: Supabase apenas)</CardDescription>
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
                <p>Nenhum webhook SuperPay encontrado</p>
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
            <CardTitle>Informações Técnicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Configuração SuperPay:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>
                    • Webhook Endpoint: <code>/api/superpay/webhook</code>
                  </li>
                  <li>
                    • Status API: <code>/api/superpay/payment-status</code>
                  </li>
                  <li>
                    • Gateway: <code>superpay</code>
                  </li>
                  <li>
                    • Armazenamento: <strong>Supabase apenas</strong>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Status Codes SuperPay:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>
                    • <strong>5</strong>: Pago (crítico)
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
      </div>
    </div>
  )
}
