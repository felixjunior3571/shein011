"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Clock, RefreshCw, Search, Webhook, AlertTriangle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface WebhookData {
  id: number
  external_id: string
  status_code: number
  status_title: string
  amount: number
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  gateway: string
  customer_id: string
  processed_at: string
  webhook_data: any
}

export default function WebhookStatusPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [searchId, setSearchId] = useState("SHEIN_1751355096377_ylb68yqqt")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchWebhook = async () => {
    if (!searchId.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", searchId.trim())
        .order("processed_at", { ascending: false })

      if (error) throw error

      setWebhooks(data || [])

      if (!data || data.length === 0) {
        setError(`Nenhum webhook encontrado para: ${searchId}`)
      }
    } catch (error) {
      console.error("Erro ao buscar webhook:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
      setWebhooks([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecentWebhooks = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .order("processed_at", { ascending: false })
        .limit(10)

      if (error) throw error

      setWebhooks(data || [])
    } catch (error) {
      console.error("Erro ao carregar webhooks:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
      setWebhooks([])
    } finally {
      setIsLoading(false)
    }
  }

  const startRealtimeListener = () => {
    setIsListening(true)
    const channel = supabase
      .channel("webhook_monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_webhooks" }, (payload) => {
        console.log("🔔 Novo webhook recebido:", payload)
        loadRecentWebhooks()
      })
      .subscribe((status) => {
        console.log("📡 Status Realtime:", status)
        if (status === "SUBSCRIBED") {
          setIsListening(true)
        } else if (status === "CHANNEL_ERROR") {
          setIsListening(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      setIsListening(false)
    }
  }

  useEffect(() => {
    searchWebhook() // Buscar o webhook específico primeiro
    const cleanup = startRealtimeListener()
    return cleanup
  }, [])

  const getStatusIcon = (webhook: WebhookData) => {
    if (webhook.is_paid) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (webhook.is_denied) return <XCircle className="w-5 h-5 text-red-500" />
    if (webhook.is_expired) return <AlertTriangle className="w-5 h-5 text-orange-500" />
    if (webhook.is_canceled) return <XCircle className="w-5 h-5 text-gray-500" />
    return <Clock className="w-5 h-5 text-blue-500" />
  }

  const getStatusColor = (webhook: WebhookData) => {
    if (webhook.is_paid) return "border-green-200 bg-green-50"
    if (webhook.is_denied) return "border-red-200 bg-red-50"
    if (webhook.is_expired) return "border-orange-200 bg-orange-50"
    if (webhook.is_canceled) return "border-gray-200 bg-gray-50"
    return "border-blue-200 bg-blue-50"
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🔔 Status dos Webhooks</h1>
          <p className="text-gray-600">Monitore webhooks em tempo real</p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Webhook Específico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o External ID (ex: SHEIN_1751355096377_ylb68yqqt)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={searchWebhook} disabled={isLoading} className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar
              </Button>
              <Button onClick={loadRecentWebhooks} disabled={isLoading} variant="outline">
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Recentes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                <span className="font-medium">Monitor em Tempo Real</span>
                {isListening && <Badge variant="default">Ativo</Badge>}
              </div>
              <div className="text-sm text-gray-500">
                {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""} encontrado{webhooks.length !== 1 ? "s" : ""}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Erro:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="space-y-4">
          {webhooks.length === 0 && !isLoading && !error && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum webhook encontrado</h3>
                <p className="text-gray-600 mb-4">
                  {searchId ? `Não encontramos webhooks para: ${searchId}` : "Nenhum webhook foi recebido ainda"}
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>• Verifique se o External ID está correto</p>
                  <p>• Execute o script SQL para corrigir a tabela</p>
                  <p>• O webhook pode ter falhou devido ao erro 500</p>
                </div>
                <Button onClick={() => (window.location.href = "/debug/setup-guide")} className="mt-4">
                  Executar Correção SQL
                </Button>
              </CardContent>
            </Card>
          )}

          {webhooks.map((webhook) => (
            <Card key={webhook.id} className={`border-2 ${getStatusColor(webhook)}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {getStatusIcon(webhook)}
                  <div className="flex-1">
                    <CardTitle className="text-lg">{webhook.status_title}</CardTitle>
                    <p className="text-sm text-gray-600">External ID: {webhook.external_id}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={webhook.is_paid ? "default" : "secondary"}>Status {webhook.status_code}</Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(webhook.processed_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Valor</p>
                    <p className="text-lg font-bold text-green-600">R$ {webhook.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Gateway</p>
                    <p className="text-sm">{webhook.gateway}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Cliente</p>
                    <p className="text-sm">{webhook.customer_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status Flags</p>
                    <div className="flex gap-1 flex-wrap">
                      {webhook.is_paid && (
                        <Badge variant="default" className="text-xs">
                          Pago
                        </Badge>
                      )}
                      {webhook.is_denied && (
                        <Badge variant="destructive" className="text-xs">
                          Negado
                        </Badge>
                      )}
                      {webhook.is_expired && (
                        <Badge variant="secondary" className="text-xs">
                          Vencido
                        </Badge>
                      )}
                      {webhook.is_canceled && (
                        <Badge variant="outline" className="text-xs">
                          Cancelado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {webhook.is_paid && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-green-800">Pagamento Confirmado!</span>
                      </div>
                      <Button onClick={() => (window.location.href = "/upp/001")} size="sm">
                        Ativar Cartão
                      </Button>
                    </div>
                  </div>
                )}

                {webhook.webhook_data && (
                  <details className="bg-white p-3 rounded border">
                    <summary className="cursor-pointer font-medium">Ver dados completos do webhook</summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-60">
                      {JSON.stringify(webhook.webhook_data, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Ações de Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/debug/setup-guide")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Webhook className="w-6 h-6" />
                <span>Executar SQL</span>
                <span className="text-xs text-gray-500">Corrigir tabela</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/debug/system-check")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <RefreshCw className="w-6 h-6" />
                <span>Verificar Sistema</span>
                <span className="text-xs text-gray-500">Diagnóstico completo</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/checkout?amount=0.28&shipping=pac&method=PAC")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <CheckCircle className="w-6 h-6" />
                <span>Novo Checkout</span>
                <span className="text-xs text-gray-500">Testar novamente</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
