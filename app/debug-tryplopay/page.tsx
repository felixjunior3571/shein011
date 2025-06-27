"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface DebugResult {
  success: boolean
  status: string
  working_methods: string[]
  recommended_method: string
  summary: {
    total_tests: number
    successful_tests: number
    failed_tests: number
    errors: number
    warnings: number
  }
  errors: string[]
  warnings: string[]
  tests: Array<{
    method: string
    endpoint: string
    status: number
    success: boolean
    response?: any
    error?: string
  }>
  config: {
    TRYPLOPAY_TOKEN: {
      exists: boolean
      length: number
      preview: string
    }
    TRYPLOPAY_SECRET_KEY: {
      exists: boolean
      length: number
      preview: string
    }
    TRYPLOPAY_API_URL: string
    TRYPLOPAY_WEBHOOK_URL: string
  }
  recommendations: string[]
}

export default function DebugTryploPayPage() {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDebug = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/tryplopay/debug-auth")
      const data = await response.json()
      setDebugResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusBadge = (status: number, success: boolean) => {
    if (success) {
      return (
        <Badge variant="default" className="bg-green-500">
          ✅ {status}
        </Badge>
      )
    } else if (status === 401) {
      return <Badge variant="destructive">🔑 {status}</Badge>
    } else if (status === 404) {
      return <Badge variant="secondary">🔍 {status}</Badge>
    } else {
      return <Badge variant="destructive">❌ {status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🔍 Debug TryploPay - Sistema de Pagamento</CardTitle>
            <CardDescription>Diagnóstico completo da integração com TryploPay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={runDebug} disabled={loading} className="flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {loading ? "Executando Debug..." : "Executar Debug Completo"}
              </Button>

              <Button variant="outline" onClick={() => window.open("/api/tryplopay/fix-credentials", "_blank")}>
                📋 Guia de Correção
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Erro no Debug
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {debugResult && (
          <>
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(debugResult.success)}
                  Status Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{debugResult.summary.total_tests}</div>
                    <div className="text-sm text-gray-600">Total de Testes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{debugResult.summary.successful_tests}</div>
                    <div className="text-sm text-gray-600">Sucessos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{debugResult.summary.failed_tests}</div>
                    <div className="text-sm text-gray-600">Falhas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{debugResult.summary.warnings}</div>
                    <div className="text-sm text-gray-600">Avisos</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h4 className="font-semibold mb-2">Status:</h4>
                  <p className="text-lg">{debugResult.status}</p>

                  {debugResult.working_methods.length > 0 && (
                    <div className="mt-2">
                      <span className="font-semibold">Métodos Funcionando: </span>
                      {debugResult.working_methods.map((method, index) => (
                        <Badge key={index} variant="default" className="ml-1">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {debugResult.recommended_method && (
                    <div className="mt-2">
                      <span className="font-semibold">Método Recomendado: </span>
                      <Badge variant="default" className="bg-green-500">
                        {debugResult.recommended_method}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>⚙️ Configuração Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">TRYPLOPAY_TOKEN:</span>
                      <div className="flex items-center gap-2">
                        {debugResult.config.TRYPLOPAY_TOKEN.exists ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-600">{debugResult.config.TRYPLOPAY_TOKEN.preview}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium">TRYPLOPAY_SECRET_KEY:</span>
                      <div className="flex items-center gap-2">
                        {debugResult.config.TRYPLOPAY_SECRET_KEY.exists ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-600">{debugResult.config.TRYPLOPAY_SECRET_KEY.preview}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">API URL:</span>
                      <span className="text-sm text-gray-600">{debugResult.config.TRYPLOPAY_API_URL}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium">Webhook URL:</span>
                      <span className="text-sm text-gray-600 truncate max-w-48">
                        {debugResult.config.TRYPLOPAY_WEBHOOK_URL}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>🧪 Resultados dos Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {debugResult.tests.map((test, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(test.success)}
                          <span className="font-medium">{test.method}</span>
                          <span className="text-sm text-gray-500">{test.endpoint}</span>
                        </div>
                        {getStatusBadge(test.status, test.success)}
                      </div>

                      {test.error && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm">
                          <strong>Erro:</strong> {test.error}
                        </div>
                      )}

                      {test.response && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                            Ver Resposta
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(test.response, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Errors and Warnings */}
            {(debugResult.errors.length > 0 || debugResult.warnings.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debugResult.errors.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        Erros ({debugResult.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {debugResult.errors.map((error, index) => (
                          <li key={index} className="text-red-600 text-sm">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {debugResult.warnings.length > 0 && (
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-orange-700 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Avisos ({debugResult.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {debugResult.warnings.map((warning, index) => (
                          <li key={index} className="text-orange-600 text-sm">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>💡 Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {debugResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.open("/api/tryplopay/test-connection", "_blank")}>
                    🧪 Teste de Conexão
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.open("/checkout", "_blank")}
                    disabled={!debugResult.success}
                  >
                    💳 Testar Checkout
                  </Button>

                  <Button variant="outline" onClick={() => window.open("/webhook-monitor", "_blank")}>
                    📡 Monitor de Webhooks
                  </Button>

                  <Button variant="outline" onClick={() => window.open("/api/tryplopay/fix-credentials", "_blank")}>
                    🔧 Guia de Correção
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
