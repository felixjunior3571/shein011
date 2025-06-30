"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Activity,
  Database,
  Zap,
  Timer,
  Shield,
} from "lucide-react"

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
  is_critical: boolean
  gateway: string
  token: string
  expires_at: string
  webhook_data: any
}

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  statusCode: number | null
  statusName: string
  amount: number
  paymentDate: string | null
  lastUpdate: string
  externalId?: string
  token?: string
  expiresAt?: string
  source: string
  error?: string
}

export default function SuperPayWebhooksDebugPage() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [testExternalId, setTestExternalId] = useState("")
  const [testResult, setTestResult] = useState<PaymentStatus | null>(null)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    denied: 0,
    expired: 0,
    canceled: 0,
    refunded: 0,
    critical: 0,
    expiredTokens: 0,
    totalAmount: 0,
  })

  // Carregar webhooks do Supabase
  const loadWebhooks = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/superpay-webhooks")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setWebhooks(data.webhooks || [])
        setStats(data.stats || {})
      } else {
        throw new Error(data.error || "Erro ao carregar webhooks")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
      console.error("Erro ao carregar webhooks SuperPay:", err)
    } finally {
      setLoading(false)
    }
  }

  // Testar consulta de status
  const testPaymentStatus = async () => {
    if (!testExternalId.trim()) return

    setLoading(true)
    setTestResult(null)

    try {
      const response = await fetch(`/api/superpay/payment-status?externalId=${encodeURIComponent(testExternalId)}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setTestResult(data.data)
      } else {
        throw new Error(data.error || "Erro na consulta")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Simular pagamento
  const simulatePayment = async (statusCode = 5) => {
    if (!testExternalId.trim()) return

    setLoading(true)
    setSimulationResult(null)

    try {
      const response = await fetch("/api/superpay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId: testExternalId,
          amount: 34.9,
          statusCode: statusCode,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setSimulationResult(data.data)
        // Recarregar webhooks após simulação
        setTimeout(loadWebhooks, 1000)
      } else {
        throw new Error(data.error || "Erro na simulação")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar webhooks
  const filteredWebhooks = webhooks.filter(
    (webhook) =>
      webhook.external_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.status_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Carregar dados iniciais
  useEffect(() => {
    loadWebhooks()
  }, [])

  // Função para obter cor do status
  const getStatusColor = (webhook: WebhookRecord) => {
    if (webhook.is_paid) return "bg-green-500"
    if (webhook.is_denied) return "bg-red-500"
    if (webhook.is_expired) return "bg-orange-500"
    if (webhook.is_canceled) return "bg-gray-500"
    if (webhook.is_refunded) return "bg-blue-500"
    return "bg-yellow-500"
  }

  // Função para verificar se token expirou
  const isTokenExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Debug SuperPay Webhooks</h1>
            <p className="text-gray-600">Monitoramento e teste do sistema de pagamentos SuperPay</p>
          </div>
          <Button onClick={loadWebhooks} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Pagos</p>
                  <p className="text-2xl font-bold">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Negados</p>
                  <p className="text-2xl font-bold">{stats.denied}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Vencidos</p>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Críticos</p>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Tokens Exp.</p>
                  <p className="text-2xl font-bold">{stats.expiredTokens}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total R$</p>
                  <p className="text-2xl font-bold">{stats.totalAmount?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Gateway</p>
                  <p className="text-lg font-bold">SuperPay</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="test">Teste de API</TabsTrigger>
            <TabsTrigger value="simulate">Simulação</TabsTrigger>
          </TabsList>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Webhooks SuperPay ({filteredWebhooks.length})
                </CardTitle>
                <CardDescription>
                  Histórico de webhooks recebidos do SuperPay com rate limiting e tokens de segurança
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      placeholder="External ID, Invoice ID ou Status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Webhooks List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredWebhooks.map((webhook) => (
                    <div key={webhook.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(webhook)}>{webhook.status_name}</Badge>
                            {webhook.is_critical && <Badge variant="destructive">CRÍTICO</Badge>}
                            {isTokenExpired(webhook.expires_at) && (
                              <Badge variant="outline" className="text-orange-600">
                                TOKEN EXPIRADO
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">External ID:</p>
                              <p className="text-gray-600 font-mono">{webhook.external_id}</p>
                            </div>
                            <div>
                              <p className="font-medium">Invoice ID:</p>
                              <p className="text-gray-600 font-mono">{webhook.invoice_id}</p>
                            </div>
                            <div>
                              <p className="font-medium">Valor:</p>
                              <p className="text-gray-600">R$ {webhook.amount.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Status Code:</p>
                              <p className="text-gray-600">{webhook.status_code}</p>
                            </div>
                            <div>
                              <p className="font-medium">Token:</p>
                              <p className="text-gray-600 font-mono text-xs">{webhook.token}</p>
                            </div>
                            <div>
                              <p className="font-medium">Expira em:</p>
                              <p className="text-gray-600 text-xs">{new Date(webhook.expires_at).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500">
                            Processado: {new Date(webhook.processed_at).toLocaleString()}
                            {webhook.payment_date && (
                              <span> | Pago: {new Date(webhook.payment_date).toLocaleString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {webhook.is_paid && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {webhook.is_denied && <XCircle className="h-5 w-5 text-red-500" />}
                          {webhook.is_expired && <Clock className="h-5 w-5 text-orange-500" />}
                          {webhook.is_canceled && <XCircle className="h-5 w-5 text-gray-500" />}
                          {webhook.is_refunded && <RefreshCw className="h-5 w-5 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredWebhooks.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum webhook encontrado</p>
                      <p className="text-sm">Tente ajustar os filtros ou aguarde novos webhooks</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Teste de Consulta de Status
                </CardTitle>
                <CardDescription>Teste a API de consulta de status de pagamento SuperPay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="testExternalId">External ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="testExternalId"
                      placeholder="SHEIN_1234567890_abc123"
                      value={testExternalId}
                      onChange={(e) => setTestExternalId(e.target.value)}
                    />
                    <Button onClick={testPaymentStatus} disabled={loading || !testExternalId.trim()}>
                      <Search className="h-4 w-4 mr-2" />
                      Consultar
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Resultado da Consulta:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Status:</p>
                        <Badge
                          className={
                            testResult.isPaid ? "bg-green-500" : testResult.isDenied ? "bg-red-500" : "bg-yellow-500"
                          }
                        >
                          {testResult.statusName}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">Valor:</p>
                        <p>R$ {testResult.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Pago:</p>
                        <p>{testResult.isPaid ? "✅ Sim" : "❌ Não"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Fonte:</p>
                        <p>{testResult.source}</p>
                      </div>
                      {testResult.token && (
                        <div className="col-span-2">
                          <p className="font-medium">Token:</p>
                          <p className="font-mono text-xs">{testResult.token}</p>
                        </div>
                      )}
                      {testResult.error && (
                        <div className="col-span-2">
                          <p className="font-medium text-red-600">Erro:</p>
                          <p className="text-red-600">{testResult.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulate Tab */}
          <TabsContent value="simulate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Simulação de Pagamento
                </CardTitle>
                <CardDescription>Simule diferentes status de pagamento SuperPay para teste</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="simulateExternalId">External ID</Label>
                  <Input
                    id="simulateExternalId"
                    placeholder="SHEIN_1234567890_abc123"
                    value={testExternalId}
                    onChange={(e) => setTestExternalId(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Button
                    onClick={() => simulatePayment(5)}
                    disabled={loading || !testExternalId.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Simular Pago
                  </Button>
                  <Button
                    onClick={() => simulatePayment(12)}
                    disabled={loading || !testExternalId.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Simular Negado
                  </Button>
                  <Button
                    onClick={() => simulatePayment(15)}
                    disabled={loading || !testExternalId.trim()}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Simular Vencido
                  </Button>
                  <Button
                    onClick={() => simulatePayment(6)}
                    disabled={loading || !testExternalId.trim()}
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    Simular Cancelado
                  </Button>
                  <Button
                    onClick={() => simulatePayment(9)}
                    disabled={loading || !testExternalId.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Simular Estornado
                  </Button>
                </div>

                {simulationResult && (
                  <div className="border rounded-lg p-4 bg-green-50">
                    <h4 className="font-medium mb-2 text-green-800">Simulação Concluída:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">External ID:</p>
                        <p className="font-mono">{simulationResult.external_id}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status:</p>
                        <Badge>{simulationResult.status_name}</Badge>
                      </div>
                      <div>
                        <p className="font-medium">Valor:</p>
                        <p>R$ {simulationResult.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Token:</p>
                        <p className="font-mono text-xs">{simulationResult.token}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
