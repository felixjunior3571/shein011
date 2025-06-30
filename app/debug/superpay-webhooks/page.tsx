"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, Clock, CheckCircle, XCircle, AlertTriangle, Ban, RotateCcw } from "lucide-react"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface WebhookRecord {
  id: string
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
  token: string | null
  expires_at: string | null
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
  totalAmount: number
  paidAmount: number
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
    totalAmount: 0,
    paidAmount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Carregando webhooks SuperPay do Supabase...")

      const { data: records, error: supabaseError } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpay")
        .order("processed_at", { ascending: false })
        .limit(50)

      if (supabaseError) {
        console.error("❌ Erro ao carregar webhooks SuperPay:", supabaseError)
        throw supabaseError
      }

      const webhookRecords = records || []
      setWebhooks(webhookRecords)

      // Calcular estatísticas
      const newStats: Stats = {
        total: webhookRecords.length,
        paid: webhookRecords.filter((w) => w.is_paid).length,
        denied: webhookRecords.filter((w) => w.is_denied).length,
        expired: webhookRecords.filter((w) => w.is_expired).length,
        canceled: webhookRecords.filter((w) => w.is_canceled).length,
        refunded: webhookRecords.filter((w) => w.is_refunded).length,
        pending: webhookRecords.filter((w) => !w.is_paid && !w.is_denied && !w.is_expired && !w.is_canceled).length,
        totalAmount: webhookRecords.reduce((sum, w) => sum + (w.amount || 0), 0),
        paidAmount: webhookRecords.filter((w) => w.is_paid).reduce((sum, w) => sum + (w.amount || 0), 0),
      }

      setStats(newStats)
      setLastUpdate(new Date().toISOString())

      console.log("✅ Webhooks SuperPay carregados:", {
        total: newStats.total,
        paid: newStats.paid,
        amount: newStats.totalAmount,
      })
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

    // Auto-refresh a cada 10 segundos
    const interval = setInterval(loadWebhooks, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (webhook: WebhookRecord) => {
    if (webhook.is_paid) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (webhook.is_denied) return <XCircle className="w-4 h-4 text-red-500" />
    if (webhook.is_expired) return <Clock className="w-4 h-4 text-orange-500" />
    if (webhook.is_canceled) return <Ban className="w-4 h-4 text-gray-500" />
    if (webhook.is_refunded) return <RotateCcw className="w-4 h-4 text-blue-500" />
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />
  }

  const getStatusBadge = (webhook: WebhookRecord) => {
    if (webhook.is_paid) return <Badge className="bg-green-100 text-green-800">Pago</Badge>
    if (webhook.is_denied) return <Badge className="bg-red-100 text-red-800">Negado</Badge>
    if (webhook.is_expired) return <Badge className="bg-orange-100 text-orange-800">Vencido</Badge>
    if (webhook.is_canceled) return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>
    if (webhook.is_refunded) return <Badge className="bg-blue-100 text-blue-800">Estornado</Badge>
    return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
  }

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date() > new Date(expiresAt)
  }

  if (loading && webhooks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando webhooks SuperPay...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SuperPay Webhooks Debug</h1>
              <p className="text-gray-600 mt-2">
                Monitoramento em tempo real dos webhooks SuperPay
                {lastUpdate && (
                  <span className="ml-2 text-sm">
                    (Última atualização: {new Date(lastUpdate).toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>
            <Button onClick={loadWebhooks} disabled={loading} className="flex items-center space-x-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-800 font-medium">Erro:</span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">R$ {stats.totalAmount.toFixed(2)} total</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pagamentos Confirmados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
              <div className="text-sm text-gray-500">R$ {stats.paidAmount.toFixed(2)} recebido</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Negados/Falhas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
              <div className="text-sm text-gray-500">
                {stats.expired} vencidos, {stats.canceled} cancelados
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">{stats.refunded} estornados</div>
            </CardContent>
          </Card>
        </div>

        {/* Webhooks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Webhooks Recentes (Supabase)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum webhook SuperPay encontrado</p>
                <p className="text-sm mt-2">Os webhooks aparecerão aqui quando recebidos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(webhook)}
                        <div>
                          <div className="font-medium text-gray-900">{webhook.external_id}</div>
                          <div className="text-sm text-gray-500">Invoice: {webhook.invoice_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(webhook)}
                        <div className="text-right">
                          <div className="font-medium">R$ {webhook.amount.toFixed(2)}</div>
                          <div className="text-sm text-gray-500">Status: {webhook.status_code}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <div className="mt-1">{webhook.status_name}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Processado:</span>
                        <div className="mt-1">{new Date(webhook.processed_at).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Token:</span>
                        <div className="mt-1 flex items-center space-x-2">
                          {webhook.token ? (
                            <>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {webhook.token.substring(0, 20)}...
                              </code>
                              {webhook.expires_at && isTokenExpired(webhook.expires_at) && (
                                <Badge className="bg-red-100 text-red-800 text-xs">Expirado</Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Sem token</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {webhook.payment_date && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="font-medium text-gray-600">Data do Pagamento:</span>
                        <div className="mt-1 text-sm">{new Date(webhook.payment_date).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
