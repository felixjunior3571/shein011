"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Webhook, Database, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface WebhookStats {
  total_received: number
  payments_confirmed: number
  payments_denied: number
  payments_expired: number
  recent_webhooks: Array<{
    timestamp: string
    invoice_id: string
    external_id: string
    status: number
    status_name: string
    is_paid: boolean
    amount: number
  }>
}

interface SystemInfo {
  webhook_only: boolean
  polling_disabled: boolean
  realtime_notifications: boolean
  storage: string
  memory_storage: boolean
  database_persistent: boolean
}

export default function SuperPayWebhooksDebug() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/superpay/webhook")
      const data = await response.json()

      setStats(data.statistics)
      setSystemInfo(data.system_info)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Atualizar a cada 5 segundos
    const interval = setInterval(fetchStats, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: number, isPaid: boolean) => {
    if (isPaid) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === 12) return <XCircle className="h-4 w-4 text-red-500" />
    if (status === 15) return <Clock className="h-4 w-4 text-orange-500" />
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusBadge = (status: number, isPaid: boolean) => {
    if (isPaid)
      return (
        <Badge variant="default" className="bg-green-500">
          Pago
        </Badge>
      )
    if (status === 12) return <Badge variant="destructive">Negado</Badge>
    if (status === 15) return <Badge variant="secondary">Vencido</Badge>
    return <Badge variant="outline">Pendente</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Webhook className="h-8 w-8 text-blue-600" />
              SuperPay Webhooks Debug
            </h1>
            <p className="text-gray-600 mt-1">Monitoramento em tempo real do sistema de webhooks SuperPay</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Última atualização: {lastUpdate}</span>
            <Button onClick={fetchStats} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Informações do Sistema
            </CardTitle>
            <CardDescription>Configuração atual do sistema de webhooks SuperPay</CardDescription>
          </CardHeader>
          <CardContent>
            {systemInfo && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={systemInfo.webhook_only ? "default" : "secondary"}>
                    {systemInfo.webhook_only ? "✅" : "❌"} Webhook Only
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={systemInfo.polling_disabled ? "default" : "destructive"}>
                    {systemInfo.polling_disabled ? "✅" : "❌"} Polling Disabled
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={systemInfo.realtime_notifications ? "default" : "secondary"}>
                    {systemInfo.realtime_notifications ? "✅" : "❌"} Real-time
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={systemInfo.storage === "supabase_only" ? "default" : "secondary"}>
                    📊 {systemInfo.storage}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={!systemInfo.memory_storage ? "default" : "destructive"}>
                    {!systemInfo.memory_storage ? "✅" : "❌"} No Memory Storage
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={systemInfo.database_persistent ? "default" : "secondary"}>
                    {systemInfo.database_persistent ? "✅" : "❌"} DB Persistent
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebidos</CardTitle>
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_received || 0}</div>
              <p className="text-xs text-muted-foreground">Webhooks processados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Confirmados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.payments_confirmed || 0}</div>
              <p className="text-xs text-muted-foreground">Status 5 - Pago</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Negados</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.payments_denied || 0}</div>
              <p className="text-xs text-muted-foreground">Status 12 - Negado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Vencidos</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.payments_expired || 0}</div>
              <p className="text-xs text-muted-foreground">Status 15 - Vencido</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Recentes</CardTitle>
            <CardDescription>Últimos webhooks processados pelo sistema (dados do Supabase)</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recent_webhooks && stats.recent_webhooks.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_webhooks.map((webhook, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(webhook.status, webhook.is_paid)}
                      <div>
                        <div className="font-medium">External ID: {webhook.external_id}</div>
                        <div className="text-sm text-gray-500">
                          Invoice: {webhook.invoice_id} • {webhook.status_name}
                        </div>
                        <div className="text-xs text-gray-400">{new Date(webhook.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">R$ {webhook.amount?.toFixed(2) || "0.00"}</span>
                      {getStatusBadge(webhook.status, webhook.is_paid)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum webhook recebido ainda</p>
                <p className="text-sm">Os webhooks aparecerão aqui quando forem processados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Endpoints da API</CardTitle>
            <CardDescription>URLs disponíveis para integração e testes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">POST</Badge>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/superpay/webhook</code>
                <span className="text-sm text-gray-600">Recebe webhooks da SuperPay</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">GET</Badge>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/superpay/payment-status</code>
                <span className="text-sm text-gray-600">Consulta status de pagamento</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">GET</Badge>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/superpay/webhook</code>
                <span className="text-sm text-gray-600">Informações e estatísticas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
