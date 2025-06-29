"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface WebhookEvent {
  externalId: string
  invoiceId: string
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  amount: number
  statusCode: number
  statusName: string
  receivedAt: string
  eventType: string
}

interface SystemStats {
  cache_size: number
  total_events: number
  memory_usage: any
  uptime: number
  max_concurrent_payments: number
}

export default function SuperPayWebhooksDebug() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshCount, setRefreshCount] = useState(0)

  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/superpay/payment-status?action=all")
      const result = await response.json()

      if (result.success) {
        setEvents(result.data || [])
      }
    } catch (error) {
      console.error("Erro ao buscar eventos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/superpay/webhook?action=stats")
      const result = await response.json()
      setStats(result)
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error)
    }
  }

  const simulateWebhook = async (status: number) => {
    try {
      const testPayload = {
        event: {
          type: "invoice.update",
          date: new Date().toISOString(),
        },
        invoices: {
          id: `test_${Date.now()}`,
          external_id: `sim_${Date.now()}`,
          token: `token_${Date.now()}`,
          date: new Date().toISOString(),
          status: {
            code: status,
            title: `Status ${status}`,
            description: `Simulação de status ${status}`,
          },
          customer: 12345,
          prices: {
            total: 2797, // R$ 27,97
          },
          type: "pix",
          payment: {
            gateway: "SuperPay",
            payId: `pay_${Date.now()}`,
            payDate: new Date().toISOString(),
            details: {
              pix_code: "00020126580014BR.GOV.BCB.PIX...",
              qrcode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
              url: "https://superpay.com.br/qr/test",
            },
          },
        },
      }

      const response = await fetch("/api/superpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      })

      const result = await response.json()
      console.log("Webhook simulado:", result)

      // Atualizar dados após simulação
      setTimeout(() => {
        fetchEvents()
        fetchStats()
      }, 1000)
    } catch (error) {
      console.error("Erro ao simular webhook:", error)
    }
  }

  useEffect(() => {
    fetchEvents()
    fetchStats()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchEvents()
      fetchStats()
      setRefreshCount((prev) => prev + 1)
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (event: WebhookEvent) => {
    if (event.isPaid) return "bg-green-100 text-green-800"
    if (event.isDenied) return "bg-red-100 text-red-800"
    if (event.isExpired) return "bg-yellow-100 text-yellow-800"
    if (event.isCanceled) return "bg-gray-100 text-gray-800"
    if (event.isRefunded) return "bg-orange-100 text-orange-800"
    return "bg-blue-100 text-blue-800"
  }

  const getStatusIcon = (event: WebhookEvent) => {
    if (event.isPaid) return "✅"
    if (event.isDenied) return "❌"
    if (event.isExpired) return "⏰"
    if (event.isCanceled) return "🚫"
    if (event.isRefunded) return "🔄"
    return "⏳"
  }

  const formatMemoryUsage = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SuperPay Webhooks Debug</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real - Sistema otimizado para alta concorrência
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "🔄 Auto" : "⏸️ Manual"} ({refreshCount})
          </Button>
          <Button
            onClick={() => {
              fetchEvents()
              fetchStats()
            }}
            disabled={isLoading}
          >
            {isLoading ? "⏳" : "🔄"} Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas do Sistema */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cache_size}</div>
              <p className="text-xs text-muted-foreground">Max: {stats.max_concurrent_payments || 10000}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_events}</div>
              <p className="text-xs text-muted-foreground">Webhooks processados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.memory_usage ? formatMemoryUsage(stats.memory_usage.heapUsed) : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Heap: {stats.memory_usage ? formatMemoryUsage(stats.memory_usage.heapTotal) : "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(stats.uptime)}</div>
              <p className="text-xs text-muted-foreground">Sistema ativo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simulação de Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Simulação de Webhooks</CardTitle>
          <CardDescription>Teste diferentes status de pagamento para validar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => simulateWebhook(5)} className="bg-green-600 hover:bg-green-700">
              ✅ Simular Pago (5)
            </Button>
            <Button onClick={() => simulateWebhook(12)} className="bg-red-600 hover:bg-red-700">
              ❌ Simular Negado (12)
            </Button>
            <Button onClick={() => simulateWebhook(15)} className="bg-yellow-600 hover:bg-yellow-700">
              ⏰ Simular Vencido (15)
            </Button>
            <Button onClick={() => simulateWebhook(6)} className="bg-gray-600 hover:bg-gray-700">
              🚫 Simular Cancelado (6)
            </Button>
            <Button onClick={() => simulateWebhook(9)} className="bg-orange-600 hover:bg-orange-700">
              🔄 Simular Estornado (9)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Recebidos ({events.length})</CardTitle>
          <CardDescription>Últimos webhooks processados pelo sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum webhook recebido ainda</p>
              <p className="text-sm">Use os botões de simulação acima para testar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 20).map((event, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon(event)}</span>
                      <Badge className={getStatusColor(event)}>
                        Status {event.statusCode}: {event.statusName}
                      </Badge>
                      <Badge variant="outline">R$ {event.amount?.toFixed(2) || "0.00"}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{new Date(event.receivedAt).toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-medium">External ID:</span>
                      <br />
                      <code className="text-xs bg-muted px-1 rounded">{event.externalId}</code>
                    </div>
                    <div>
                      <span className="font-medium">Invoice ID:</span>
                      <br />
                      <code className="text-xs bg-muted px-1 rounded">{event.invoiceId}</code>
                    </div>
                    <div>
                      <span className="font-medium">Estados:</span>
                      <br />
                      <div className="flex gap-1 text-xs">
                        {event.isPaid && <Badge className="bg-green-100 text-green-800">Pago</Badge>}
                        {event.isDenied && <Badge className="bg-red-100 text-red-800">Negado</Badge>}
                        {event.isExpired && <Badge className="bg-yellow-100 text-yellow-800">Vencido</Badge>}
                        {event.isCanceled && <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>}
                        {event.isRefunded && <Badge className="bg-orange-100 text-orange-800">Estornado</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Info */}
      <Card>
        <CardHeader>
          <CardTitle>Performance & Concorrência</CardTitle>
          <CardDescription>Informações sobre a capacidade do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Otimizações Implementadas:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>✅ Cache LRU otimizado (10k pagamentos)</li>
                <li>✅ Pool de conexões Supabase (5 conexões)</li>
                <li>✅ Rate limiting por IP (100/min)</li>
                <li>✅ Processamento assíncrono</li>
                <li>✅ Validação fail-fast</li>
                <li>✅ Detecção de duplicatas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Capacidades:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>🚀 Suporte a 50+ pagamentos simultâneos</li>
                <li>⚡ Resposta menor que 100ms por webhook</li>
                <li>💾 Cache inteligente com TTL</li>
                <li>🔄 Backoff exponencial em erros</li>
                <li>📊 Monitoramento em tempo real</li>
                <li>🛡️ Proteção contra memory leaks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
