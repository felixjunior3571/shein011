"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function WebhookMonitorTestPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [externalId, setExternalId] = useState(`TEST_${Date.now()}`)

  const runWebhookTest = async (testType: "checkout" | "activation") => {
    setLoading(true)

    try {
      console.log(`🧪 Executando teste webhook ${testType.toUpperCase()}...`)

      const testData = {
        checkout: {
          external_id: `TEST_CHECKOUT_${Date.now()}`,
          amount: 34.9,
          redirect_type: "checkout",
        },
        activation: {
          external_id: `TEST_ACTIVATION_${Date.now()}`,
          amount: 25.0,
          redirect_type: "activation",
        },
      }

      const data = testData[testType]

      // Primeiro, criar uma fatura fictícia
      const createResponse = await fetch("/api/superpaybr/create-test-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar fatura teste: ${createResponse.statusText}`)
      }

      const createResult = await createResponse.json()
      console.log("✅ Fatura teste criada:", createResult)

      // Agora simular o pagamento
      const simulateResponse = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const simulateResult = await simulateResponse.json()

      // Verificar status via webhook
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Aguardar 1 segundo

      const statusResponse = await fetch(`/api/superpaybr/check-webhook-status?external_id=${data.external_id}`)
      const statusResult = await statusResponse.json()

      setTestResults((prev) => [
        {
          testType,
          timestamp: new Date().toISOString(),
          success: simulateResult.success && statusResult.success,
          createResult,
          simulateResult,
          statusResult,
          external_id: data.external_id,
        },
        ...prev,
      ])

      console.log(`📊 Resultado do teste ${testType}:`, {
        simulate: simulateResult,
        status: statusResult,
      })
    } catch (error) {
      console.error(`❌ Erro no teste ${testType}:`, error)
      setTestResults((prev) => [
        {
          testType,
          timestamp: new Date().toISOString(),
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        ...prev,
      ])
    } finally {
      setLoading(false)
    }
  }

  const testSpecificExternalId = async () => {
    if (!externalId.trim()) {
      alert("Por favor, insira um External ID")
      return
    }

    setLoading(true)

    try {
      console.log(`🔍 Testando External ID específico: ${externalId}`)

      const response = await fetch(`/api/superpaybr/check-webhook-status?external_id=${externalId}`)
      const result = await response.json()

      setTestResults((prev) => [
        {
          testType: "specific_check",
          timestamp: new Date().toISOString(),
          success: response.ok,
          statusResult: result,
          external_id: externalId,
        },
        ...prev,
      ])

      console.log("📊 Resultado da verificação:", result)
    } catch (error) {
      console.error("❌ Erro na verificação:", error)
      setTestResults((prev) => [
        {
          testType: "specific_check",
          timestamp: new Date().toISOString(),
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
          external_id: externalId,
        },
        ...prev,
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Webhook Monitor Test</h1>
        <p className="text-gray-600">Teste o sistema de monitoramento de webhook sem rate limiting</p>
      </div>

      {/* Test Controls */}
      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Testes Automatizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => runWebhookTest("checkout")}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Testando..." : "🛒 Testar Fluxo CHECKOUT → /upp/001"}
              </Button>

              <Button
                onClick={() => runWebhookTest("activation")}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Testando..." : "🎯 Testar Fluxo ACTIVATION → /upp10"}
              </Button>

              <Button onClick={clearResults} variant="outline" disabled={loading}>
                🗑️ Limpar Resultados
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teste External ID Específico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="external-id">External ID</Label>
                <Input
                  id="external-id"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="Digite o External ID para verificar"
                />
              </div>
              <Button onClick={testSpecificExternalId} disabled={loading}>
                {loading ? "Verificando..." : "🔍 Verificar Status"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Resultados dos Testes</h2>

        {testResults.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhum teste executado ainda</p>
            </CardContent>
          </Card>
        ) : (
          testResults.map((result, index) => (
            <Card key={index} className={result.success ? "border-green-200" : "border-red-200"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "✅ SUCESSO" : "❌ ERRO"}
                    </Badge>
                    <span className="text-sm font-normal">
                      {result.testType?.toUpperCase()} - {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </CardTitle>
                  {result.external_id && (
                    <Badge variant="outline" className="text-xs">
                      {result.external_id}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.error && (
                    <div>
                      <h4 className="font-semibold mb-2 text-red-700">Erro:</h4>
                      <p className="text-red-600 text-sm">{result.error}</p>
                    </div>
                  )}

                  {result.statusResult && (
                    <div>
                      <h4 className="font-semibold mb-2">Status do Webhook:</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(result.statusResult, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.simulateResult && (
                    <div>
                      <h4 className="font-semibold mb-2">Resultado da Simulação:</h4>
                      <pre className="bg-blue-50 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(result.simulateResult, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.createResult && (
                    <div>
                      <h4 className="font-semibold mb-2">Criação da Fatura:</h4>
                      <pre className="bg-green-50 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(result.createResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Como Funciona o Sistema Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold">🔄 Fluxo Webhook (SEM RATE LIMITING):</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>SuperPayBR envia webhook quando status muda</li>
                <li>Webhook salva notificação na tabela `webhook_notifications`</li>
                <li>Frontend monitora via `/api/superpaybr/check-webhook-status`</li>
                <li>Redirecionamento automático baseado em `redirect_type`</li>
                <li>Notificações expiram em 15 minutos</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold">🎯 Tipos de Redirecionamento:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>checkout:</strong> /checkout → pagamento → /upp/001
                </li>
                <li>
                  <strong>activation:</strong> /upp/checkout → pagamento → /upp10
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">📊 Status SuperPayBR:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>1: Pendente | 2: Processando | 3: Aguardando | 4: Em Análise</li>
                <li>5: ✅ Pago | 6: ❌ Recusado | 7: ❌ Cancelado | 8: ❌ Estornado</li>
                <li>9: ❌ Vencido | 10: ❌ Contestado</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">⚡ Vantagens do Sistema:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Sem rate limiting - usa apenas webhooks</li>
                <li>Redirecionamento automático e inteligente</li>
                <li>Notificações com expiração automática</li>
                <li>Fallback para consulta de banco de dados</li>
                <li>Debug completo em desenvolvimento</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
