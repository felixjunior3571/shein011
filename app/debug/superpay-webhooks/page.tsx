"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Search, Trash2, Play, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface SuperPayWebhook {
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
  is_critical: boolean
  gateway: string
  token: string
  expires_at: string
  webhook_data: any
}

interface SuperPayStats {
  total: number
  paid: number
  denied: number
  expired: number
  canceled: number
  refunded: number
  critical: number
  expiredTokens: number
  totalAmount: number
}

export default function SuperPayWebhooksDebugPage() {
  const [webhooks, setWebhooks] = useState<SuperPayWebhook[]>([])
  const [stats, setStats] = useState<SuperPayStats>({
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  // Estados para simulação
  const [simulationData, setSimulationData] = useState({
    external_id: "",
    status_code: "5",
    amount: "29.90",
  })

  // Estados para consulta
  const [queryExternalId, setQueryExternalId] = useState("")
  const [queryResult, setQueryResult] = useState<any>(null)
  const [isQuerying, setIsQuerying] = useState(false)

  const loadWebhooks = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("🔄 Carregando webhooks SuperPay...")

      const response = await fetch("/api/debug/superpay-webhooks")
      const data = await response.json()

      console.log("📊 Resposta da API:", data)

      if (data.success) {
        setWebhooks(data.webhooks || [])
        setStats(data.stats || stats)
        if (data.message) {
          setMessage(data.message)
        }
      } else {
        setError(data.message || "Erro ao carregar webhooks")
      }
    } catch (err) {
      console.error("❌ Erro ao carregar webhooks:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsLoading(false)
    }
  }

  const clearTestData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/debug/superpay-webhooks?action=clear_test_data", {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        setMessage("Dados de teste removidos com sucesso")
        await loadWebhooks()
      } else {
        setError(data.message || "Erro ao limpar dados")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao limpar dados")
    } finally {
      setIsLoading(false)
    }
  }

  const simulatePayment = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/superpay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(simulationData),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`Pagamento simulado: ${data.simulation.external_id} - ${data.simulation.status_name}`)
        await loadWebhooks()
      } else {
        setError(data.message || "Erro na simulação")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na simulação")
    } finally {
      setIsLoading(false)
    }
  }

  const queryPaymentStatus = async () => {
    try {
      setIsQuerying(true)
      setQueryResult(null)

      const response = await fetch(`/api/superpay/payment-status?externalId=${encodeURIComponent(queryExternalId)}`)
      const data = await response.json()

      setQueryResult(data)
    } catch (err) {
      setQueryResult({
        success: false,
        error: err instanceof Error ? err.message : "Erro na consulta",
      })
    } finally {
      setIsQuerying(false)
    }
  }

  useEffect(() => {
    loadWebhooks()
  }, [])

  const filteredWebhooks = webhooks.filter(
    (webhook) =>
      webhook.external_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.status_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (webhook: SuperPayWebhook) => {
    if (webhook.is_paid) {
      return <Badge className="bg-green-100 text-green-800">Pago</Badge>
    }
    if (webhook.is_denied) {
      return <Badge className="bg-red-100 text-red-800">Negado</Badge>
    }
    if (webhook.is_expired) {
      return <Badge className="bg-orange-100 text-orange-800">Vencido</Badge>
    }
    if (webhook.is_canceled) {
      return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>
    }
    if (webhook.is_refunded) {
      return <Badge className="bg-blue-100 text-blue-800">Estornado</Badge>
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
  }

  const getStatusIcon = (webhook: SuperPayWebhook) => {
    if (webhook.is_paid) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (webhook.is_denied) return <XCircle className="h-4 w-4 text-red-600" />
    if (webhook.is_expired) return <Clock className="h-4 w-4 text-orange-600" />
    if (webhook.is_canceled) return <XCircle className="h-4 w-4 text-gray-600" />
    if (webhook.is_refunded) return <RefreshCw className="h-4 w-4 text-blue-600" />
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  }

  const isTokenExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug SuperPay Webhooks</h1>
          <p className="text-muted-foreground">Monitoramento e debug do sistema SuperPay</p>
        </div>
        <Button onClick={loadWebhooks} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Pagos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
            <div className="text-sm text-muted-foreground">Negados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
            <div className="text-sm text-muted-foreground">Vencidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.canceled}</div>
            <div className="text-sm text-muted-foreground">Cancelados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.refunded}</div>
            <div className="text-sm text-muted-foreground">Estornados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Críticos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">R$ {stats.totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="query">Consulta</TabsTrigger>
          <TabsTrigger value="simulation">Simulação</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks SuperPay</CardTitle>
              <CardDescription>Lista de todos os webhooks recebidos do SuperPay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Buscar por External ID, Status ou Invoice ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={clearTestData} disabled={isLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Testes
                </Button>
              </div>

              <div className="space-y-2">
                {filteredWebhooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {webhooks.length === 0 ? "Nenhum webhook encontrado" : "Nenhum resultado para a busca"}
                  </div>
                ) : (
                  filteredWebhooks.map((webhook) => (
                    <Card key={webhook.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(webhook)}
                          <div>
                            <div className="font-medium">{webhook.external_id}</div>
                            <div className="text-sm text-muted-foreground">
                              Invoice: {webhook.invoice_id} • R$ {webhook.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(webhook)}
                          {webhook.is_critical && <Badge variant="destructive">Crítico</Badge>}
                          {isTokenExpired(webhook.expires_at) && <Badge variant="outline">Token Expirado</Badge>}
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Status</div>
                          <div className="text-muted-foreground">
                            {webhook.status_code} - {webhook.status_name}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Processado</div>
                          <div className="text-muted-foreground">
                            {new Date(webhook.processed_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Token</div>
                          <div className="text-muted-foreground font-mono text-xs">{webhook.token}</div>
                        </div>
                        <div>
                          <div className="font-medium">Expira</div>
                          <div
                            className={`text-muted-foreground ${isTokenExpired(webhook.expires_at) ? "text-red-600" : ""}`}
                          >
                            {new Date(webhook.expires_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultar Status de Pagamento</CardTitle>
              <CardDescription>Consulte o status de um pagamento específico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="queryExternalId">External ID:</Label>
                <Input
                  id="queryExternalId"
                  placeholder="Ex: SHEIN_1751300612038_uvmsz4q2z"
                  value={queryExternalId}
                  onChange={(e) => setQueryExternalId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={queryPaymentStatus} disabled={isQuerying || !queryExternalId}>
                  <Search className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
              </div>

              {queryResult && (
                <Card>
                  <CardContent className="p-4">
                    <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(queryResult, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simular Pagamento SuperPay</CardTitle>
              <CardDescription>Simule webhooks SuperPay para teste</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="simExternalId">External ID:</Label>
                  <Input
                    id="simExternalId"
                    placeholder="Ex: TEST_SIMULATION_001"
                    value={simulationData.external_id}
                    onChange={(e) => setSimulationData({ ...simulationData, external_id: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="simStatusCode">Status Code (1-15):</Label>
                  <Input
                    id="simStatusCode"
                    type="number"
                    min="1"
                    max="15"
                    value={simulationData.status_code}
                    onChange={(e) => setSimulationData({ ...simulationData, status_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="simAmount">Valor (R$):</Label>
                  <Input
                    id="simAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={simulationData.amount}
                    onChange={(e) => setSimulationData({ ...simulationData, amount: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={simulatePayment} disabled={isLoading || !simulationData.external_id}>
                <Play className="h-4 w-4 mr-2" />
                Simular Pagamento
              </Button>

              <div className="text-sm text-muted-foreground">
                <strong>Status Codes SuperPay:</strong>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  <div>1 - Aguardando</div>
                  <div>2 - Processamento</div>
                  <div>3 - Processando</div>
                  <div>4 - Aprovado</div>
                  <div>5 - Pago (Crítico)</div>
                  <div>6 - Cancelado (Crítico)</div>
                  <div>7 - Contestado</div>
                  <div>8 - Chargeback (Crítico)</div>
                  <div>9 - Estornado (Crítico)</div>
                  <div>10 - Falha (Crítico)</div>
                  <div>11 - Bloqueado (Crítico)</div>
                  <div>12 - Negado (Crítico)</div>
                  <div>13 - Análise</div>
                  <div>14 - Análise Manual</div>
                  <div>15 - Vencido (Crítico)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
