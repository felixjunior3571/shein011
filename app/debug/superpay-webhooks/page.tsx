"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, Clock, AlertTriangle, DollarSign } from "lucide-react"
import {
  getAllSuperPayConfirmations,
  getSuperPayRealtimeEvents,
  getSuperPayStats,
  cleanupExpiredSuperPayConfirmations,
} from "@/lib/superpay-payment-storage"

export default function SuperPayWebhooksDebugPage() {
  const [memoryData, setMemoryData] = useState<any[]>([])
  const [supabaseData, setSupabaseData] = useState<any[]>([])
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar dados da memória
      const memoryConfirmations = getAllSuperPayConfirmations()
      const events = getSuperPayRealtimeEvents()
      const statistics = getSuperPayStats()

      setMemoryData(memoryConfirmations)
      setRealtimeEvents(events)
      setStats(statistics)

      // Carregar dados do Supabase
      const response = await fetch("/api/superpay/payment-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalIds: memoryConfirmations.map((c) => c.externalId),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSupabaseData(result.data || [])
      }

      setLastUpdate(new Date().toLocaleString())
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const cleanupExpired = () => {
    const cleaned = cleanupExpiredSuperPayConfirmations()
    alert(`${cleaned} confirmações expiradas removidas da memória`)
    loadData()
  }

  const simulatePayment = async () => {
    try {
      const testExternalId = `TEST_${Date.now()}`
      const response = await fetch("/api/superpay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId: testExternalId,
          amount: 34.9,
          statusCode: 5,
        }),
      })

      if (response.ok) {
        alert(`Pagamento simulado para External ID: ${testExternalId}`)
        loadData()
      } else {
        alert("Erro ao simular pagamento")
      }
    } catch (error) {
      console.error("Erro na simulação:", error)
      alert("Erro ao simular pagamento")
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000) // Atualizar a cada 5 segundos
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (confirmation: any) => {
    if (confirmation.isPaid) {
      return <Badge className="bg-green-500">✅ Pago</Badge>
    }
    if (confirmation.isDenied) {
      return <Badge className="bg-red-500">❌ Negado</Badge>
    }
    if (confirmation.isExpired) {
      return <Badge className="bg-orange-500">⏰ Vencido</Badge>
    }
    if (confirmation.isCanceled) {
      return <Badge className="bg-gray-500">🚫 Cancelado</Badge>
    }
    if (confirmation.isRefunded) {
      return <Badge className="bg-blue-500">🔄 Estornado</Badge>
    }
    return <Badge className="bg-yellow-500">⏳ Pendente</Badge>
  }

  const isTokenExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🔧 Debug SuperPay Webhooks</h1>
        <div className="flex space-x-2">
          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={cleanupExpired} variant="outline">
            🧹 Limpar Expirados
          </Button>
          <Button onClick={simulatePayment} variant="outline">
            🧪 Simular Pagamento
          </Button>
        </div>
      </div>

      {lastUpdate && <p className="text-sm text-gray-600">Última atualização: {lastUpdate}</p>}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <p className="text-xs text-muted-foreground">confirmações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid || 0}</div>
            <p className="text-xs text-muted-foreground">R$ {(stats.paidAmount || 0).toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
            <p className="text-xs text-muted-foreground">aguardando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.events || 0}</div>
            <p className="text-xs text-muted-foreground">em tempo real</p>
          </CardContent>
        </Card>
      </div>

      {/* Dados da Memória */}
      <Card>
        <CardHeader>
          <CardTitle>💾 Dados da Memória SuperPay ({memoryData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {memoryData.length === 0 ? (
            <p className="text-gray-500">Nenhuma confirmação na memória</p>
          ) : (
            <div className="space-y-4">
              {memoryData.map((confirmation, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    isTokenExpired(confirmation.expiresAt) ? "bg-red-50 border-red-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(confirmation)}
                      {isTokenExpired(confirmation.expiresAt) && (
                        <Badge className="bg-red-500">⏰ TOKEN EXPIRADO</Badge>
                      )}
                    </div>
                    <span className="text-sm font-mono">{confirmation.externalId}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <strong>Valor:</strong> R$ {confirmation.amount.toFixed(2)}
                    </div>
                    <div>
                      <strong>Status:</strong> {confirmation.statusName}
                    </div>
                    <div>
                      <strong>Token:</strong> {confirmation.token}
                    </div>
                    <div>
                      <strong>Expira:</strong>{" "}
                      <span className={isTokenExpired(confirmation.expiresAt) ? "text-red-600 font-bold" : ""}>
                        {new Date(confirmation.expiresAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {confirmation.paymentDate && (
                    <div className="text-sm mt-2">
                      <strong>Data Pagamento:</strong> {new Date(confirmation.paymentDate).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dados do Supabase */}
      <Card>
        <CardHeader>
          <CardTitle>🗄️ Dados do Supabase SuperPay ({supabaseData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {supabaseData.length === 0 ? (
            <p className="text-gray-500">Nenhum dado no Supabase</p>
          ) : (
            <div className="space-y-4">
              {supabaseData.map((record, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    record.source === "token_expired" ? "bg-red-50 border-red-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {record.isPaid && <Badge className="bg-green-500">✅ Pago</Badge>}
                      {record.isDenied && <Badge className="bg-red-500">❌ Negado</Badge>}
                      {record.isExpired && <Badge className="bg-orange-500">⏰ Vencido</Badge>}
                      {record.isCanceled && <Badge className="bg-gray-500">🚫 Cancelado</Badge>}
                      {!record.isPaid && !record.isDenied && !record.isExpired && !record.isCanceled && (
                        <Badge className="bg-yellow-500">⏳ Pendente</Badge>
                      )}
                      {record.source === "token_expired" && <Badge className="bg-red-500">⏰ TOKEN EXPIRADO</Badge>}
                      <Badge variant="outline">{record.source}</Badge>
                    </div>
                    <span className="text-sm font-mono">{record.externalId}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <strong>Valor:</strong> R$ {record.amount.toFixed(2)}
                    </div>
                    <div>
                      <strong>Status:</strong> {record.statusName}
                    </div>
                    <div>
                      <strong>Token:</strong> {record.token || "N/A"}
                    </div>
                    <div>
                      <strong>Última Atualização:</strong> {new Date(record.lastUpdate).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eventos em Tempo Real */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Eventos em Tempo Real SuperPay ({realtimeEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {realtimeEvents.length === 0 ? (
            <p className="text-gray-500">Nenhum evento registrado</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {realtimeEvents.map((event, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{event.type}</Badge>
                      <span className="font-mono">{event.externalId}</span>
                    </div>
                    <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-1">
                    <strong>Status:</strong> {event.statusName} | <strong>Valor:</strong> R$ {event.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
