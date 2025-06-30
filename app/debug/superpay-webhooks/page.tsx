"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Database, TestTube, Zap, XCircle } from "lucide-react"

interface SuperPayWebhook {
  id: number
  external_id: string
  invoice_id: string
  status_code: number
  status_name: string
  amount: number
  payment_date?: string
  processed_at: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  is_critical: boolean
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
  const [message, setMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [testExternalId, setTestExternalId] = useState("")
  const [testResult, setTestResult] = useState<any>(null)
  const [simulateExternalId, setSimulateExternalId] = useState("")
  const [simulateStatusCode, setSimulateStatusCode] = useState(5)
  const [simulateAmount, setSimulateAmount] = useState(29.9)
  const [simulateResult, setSimulateResult] = useState<any>(null)

  const loadWebhooks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setMessage(null)

      console.log("🔍 Carregando webhooks SuperPay...")

      const response = await fetch("/api/debug/superpay-webhooks")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setWebhooks(data.webhooks || [])
        setStats(data.stats || stats)

        if (data.message) {
          setMessage(data.message)
        }

        console.log(`✅ ${data.webhooks?.length || 0} webhooks carregados`)
      } else {
        throw new Error(data.message || "Erro ao carregar webhooks")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
      console.error("❌ Erro ao carregar webhooks:", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const testPaymentStatus = async () => {
    if (!testExternalId.trim()) {
      setTestResult({ error: "External ID é obrigatório" })
      return
    }

    try {
      setTestResult({ loading: true })

      const response = await fetch(`/api/superpay/payment-status?externalId=${encodeURIComponent(testExternalId)}`)
      const data = await response.json()

      setTestResult(data)
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      })
    }
  }

  const simulatePayment = async () => {
    if (!simulateExternalId.trim()) {
      setSimulateResult({ error: "External ID é obrigatório" })
      return
    }

    try {
      setSimulateResult({ loading: true })

      const response = await fetch("/api/superpay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId: simulateExternalId,
          statusCode: simulateStatusCode,
          amount: simulateAmount,
        }),
      })

      const data = await response.json()
      setSimulateResult(data)

      // Recarregar webhooks após simulação
      if (data.success) {
        setTimeout(loadWebhooks, 1000)
      }
    } catch (err) {
      setSimulateResult({
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      })
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
        loadWebhooks()
      } else {
        setError(data.message || "Erro ao limpar dados")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWebhooks()
  }, [])

  const filteredWebhooks = webhooks.filter(
    (webhook) =>
      webhook.external_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webhook.status_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (webhook: SuperPayWebhook) => {
    if (webhook.is_paid) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Pago</Badge>
    }
    if (webhook.is_denied) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Negado</Badge>
    }
    if (webhook.is_expired) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">⏰ Vencido</Badge>
    }
    if (webhook.is_canceled) {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">🚫 Cancelado</Badge>
    }
    if (webhook.is_refunded) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">🔄 Estornado</Badge>
    }
    if (webhook.is_critical) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠️ Crítico</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-600 border-gray-200">⏳ Pendente</Badge>
  }

  const getTokenStatus = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)

    if (expiry < now) {
      return <Badge variant="destructive">🔴 Expirado</Badge>
    }

    const minutesLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60))
    if (minutesLeft < 5) {
      return <Badge className="bg-orange-100 text-orange-800">⚠️ {minutesLeft}min</Badge>
    }

    return <Badge className="bg-green-100 text-green-800">✅ {minutesLeft}min</Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug SuperPay Webhooks</h1>
          <p className="text-muted-foreground">Sistema de monitoramento e debug para webhooks SuperPay</p>
        </div>
        <Button onClick={loadWebhooks} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Erro:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Info:</strong> {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Pagos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
            <div className="text-sm text-muted-foreground">Negados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
            <div className="text-sm text-muted-foreground">Vencidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.canceled}</div>
            <div className="text-sm text-muted-foreground">Cancelados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.refunded}</div>
            <div className="text-sm text-muted-foreground">Estornados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Críticos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">R$ {stats.totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="webhooks">
            <Database className="w-4 h-4 mr-2" />
            Webhooks ({webhooks.length})
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="w-4 h-4 mr-2" />
            Teste
          </TabsTrigger>
          <TabsTrigger value="simulate">
            <Zap className="w-4 h-4 mr-2" />
            Simulação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar webhooks</Label>
              <Input
                id="search"
                placeholder="External ID, Invoice ID ou Status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={clearTestData} variant="outline" className="mt-6 bg-transparent">
              Limpar Dados de Teste
            </Button>
          </div>

          <div className="space-y-4">
            {filteredWebhooks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum webhook encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {webhooks.length === 0
                      ? "Execute os scripts SQL para criar dados de teste"
                      : "Nenhum webhook corresponde aos critérios de busca"}
                  </p>
                  {webhooks.length === 0 && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        1. Execute: <code>scripts/create-superpay-webhooks-table.sql</code>
                      </p>
                      <p>
                        2. Execute: <code>scripts/test-superpay-system.sql</code>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredWebhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{webhook.external_id}</CardTitle>
                        <CardDescription>
                          Invoice: {webhook.invoice_id} • Status: {webhook.status_code}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(webhook)}
                        {getTokenStatus(webhook.expires_at)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <div className="font-medium">{webhook.status_name}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Valor</Label>
                        <div className="font-medium">R$ {webhook.amount.toFixed(2)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Processado</Label>
                        <div className="font-medium">{new Date(webhook.processed_at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Token Expira</Label>
                        <div className="font-medium">{new Date(webhook.expires_at).toLocaleString("pt-BR")}</div>
                      </div>
                    </div>

                    {webhook.payment_date && (
                      <div className="mt-4 pt-4 border-t">
                        <Label className="text-muted-foreground">Data do Pagamento</Label>
                        <div className="font-medium text-green-600">
                          {new Date(webhook.payment_date).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-muted-foreground">Estados</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {webhook.is_paid && <Badge className="bg-green-100 text-green-800">Pago</Badge>}
                        {webhook.is_denied && <Badge className="bg-red-100 text-red-800">Negado</Badge>}
                        {webhook.is_expired && <Badge className="bg-orange-100 text-orange-800">Vencido</Badge>}
                        {webhook.is_canceled && <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>}
                        {webhook.is_refunded && <Badge className="bg-blue-100 text-blue-800">Estornado</Badge>}
                        {webhook.is_critical && <Badge className="bg-yellow-100 text-yellow-800">Crítico</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testar Consulta de Status</CardTitle>
              <CardDescription>Consulte o status de um pagamento pelo External ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testExternalId">External ID</Label>
                <Input
                  id="testExternalId"
                  placeholder="Ex: TEST_SUPERPAY_005"
                  value={testExternalId}
                  onChange={(e) => setTestExternalId(e.target.value)}
                />
              </div>
              <Button onClick={testPaymentStatus} disabled={!testExternalId.trim()}>
                <TestTube className="w-4 h-4 mr-2" />
                Consultar Status
              </Button>

              {testResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <Label className="text-muted-foreground">Resultado:</Label>
                  <pre className="mt-2 text-sm overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simular Pagamento</CardTitle>
              <CardDescription>Simule um webhook SuperPay para testar o sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="simulateExternalId">External ID</Label>
                  <Input
                    id="simulateExternalId"
                    placeholder="Ex: SHEIN_123456789_abc"
                    value={simulateExternalId}
                    onChange={(e) => setSimulateExternalId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="simulateStatusCode">Status Code</Label>
                  <select
                    id="simulateStatusCode"
                    className="w-full p-2 border rounded-md"
                    value={simulateStatusCode}
                    onChange={(e) => setSimulateStatusCode(Number(e.target.value))}
                  >
                    <option value={1}>1 - Aguardando Pagamento</option>
                    <option value={2}>2 - Em Processamento</option>
                    <option value={3}>3 - Processando</option>
                    <option value={4}>4 - Aprovado</option>
                    <option value={5}>5 - Pago</option>
                    <option value={6}>6 - Cancelado</option>
                    <option value={7}>7 - Contestado</option>
                    <option value={8}>8 - Chargeback</option>
                    <option value={9}>9 - Estornado</option>
                    <option value={10}>10 - Falha</option>
                    <option value={11}>11 - Bloqueado</option>
                    <option value={12}>12 - Negado</option>
                    <option value={13}>13 - Análise</option>
                    <option value={14}>14 - Análise Manual</option>
                    <option value={15}>15 - Vencido</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="simulateAmount">Valor (R$)</Label>
                  <Input
                    id="simulateAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={simulateAmount}
                    onChange={(e) => setSimulateAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button onClick={simulatePayment} disabled={!simulateExternalId.trim()}>
                <Zap className="w-4 h-4 mr-2" />
                Simular Pagamento
              </Button>

              {simulateResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <Label className="text-muted-foreground">Resultado da Simulação:</Label>
                  <pre className="mt-2 text-sm overflow-auto">{JSON.stringify(simulateResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
