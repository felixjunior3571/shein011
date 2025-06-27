"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface AuthTest {
  method: string
  status: number
  success: boolean
  response?: any
  error?: string
  headers_sent?: any
}

interface DebugResponse {
  success: boolean
  working_methods: number
  total_methods_tested: number
  status: string
  debug: {
    config: any
    auth_tests: AuthTest[]
    errors: string[]
    recommendations: string[]
  }
}

export default function DebugTryploPayPage() {
  const [debugData, setDebugData] = useState<DebugResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [testingCreation, setTestingCreation] = useState(false)
  const [creationResult, setCreationResult] = useState<any>(null)

  const runDebug = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tryplopay/debug-auth")
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error("Erro ao executar debug:", error)
    } finally {
      setLoading(false)
    }
  }

  const testCreation = async () => {
    setTestingCreation(true)
    try {
      const response = await fetch("/api/tryplopay/debug-auth", { method: "POST" })
      const data = await response.json()
      setCreationResult(data)
    } catch (error) {
      console.error("Erro ao testar criação:", error)
    } finally {
      setTestingCreation(false)
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
      return <Badge variant="destructive">🔑 {status} Unauthorized</Badge>
    } else if (status === 0) {
      return <Badge variant="secondary">❌ Connection Error</Badge>
    } else {
      return <Badge variant="destructive">❌ {status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Debug TryploPay</h1>
          <p className="text-gray-600">Diagnóstico completo da integração TryploPay</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuração Atual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Configuração Atual
              </CardTitle>
              <CardDescription>Status das variáveis de ambiente</CardDescription>
            </CardHeader>
            <CardContent>
              {debugData ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">TRYPLOPAY_TOKEN:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(debugData.debug.config.TRYPLOPAY_TOKEN.exists)}
                      <span className="text-sm">
                        {debugData.debug.config.TRYPLOPAY_TOKEN.exists
                          ? `${debugData.debug.config.TRYPLOPAY_TOKEN.length} chars`
                          : "Não configurado"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">TRYPLOPAY_SECRET_KEY:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(debugData.debug.config.TRYPLOPAY_SECRET_KEY.exists)}
                      <span className="text-sm">
                        {debugData.debug.config.TRYPLOPAY_SECRET_KEY.exists
                          ? `${debugData.debug.config.TRYPLOPAY_SECRET_KEY.length} chars`
                          : "Não configurado"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">TRYPLOPAY_API_URL:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(debugData.debug.config.TRYPLOPAY_API_URL.exists)}
                      <span className="text-sm">{debugData.debug.config.TRYPLOPAY_API_URL.value}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Execute o debug para ver a configuração</p>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações de Debug</CardTitle>
              <CardDescription>Execute testes de conectividade e autenticação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runDebug} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando Debug...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Executar Debug Completo
                  </>
                )}
              </Button>

              {debugData && debugData.working_methods > 0 && (
                <Button
                  onClick={testCreation}
                  disabled={testingCreation}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  {testingCreation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando Criação...
                    </>
                  ) : (
                    "Testar Criação de Fatura"
                  )}
                </Button>
              )}

              <Button
                onClick={() => window.open("/api/tryplopay/fix-credentials", "_blank")}
                variant="secondary"
                className="w-full"
              >
                📋 Guia de Correção
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultados dos Testes */}
        {debugData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(debugData.success)}
                Resultados dos Testes de Autenticação
              </CardTitle>
              <CardDescription>
                {debugData.working_methods} de {debugData.total_methods_tested} métodos funcionando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {debugData.debug.auth_tests.map((test, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{test.method}</h4>
                      {getStatusBadge(test.status, test.success)}
                    </div>

                    {test.response && (
                      <div className="bg-gray-50 rounded p-3 mt-2">
                        <p className="text-sm font-medium mb-1">Resposta:</p>
                        <pre className="text-xs overflow-x-auto">{JSON.stringify(test.response, null, 2)}</pre>
                      </div>
                    )}

                    {test.error && (
                      <div className="bg-red-50 rounded p-3 mt-2">
                        <p className="text-sm font-medium text-red-700 mb-1">Erro:</p>
                        <p className="text-xs text-red-600">{test.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recomendações */}
              {debugData.debug.recommendations.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">📋 Recomendações:</h4>
                  <ul className="space-y-1">
                    {debugData.debug.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-blue-800">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Erros */}
              {debugData.debug.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">❌ Erros Encontrados:</h4>
                  <ul className="space-y-1">
                    {debugData.debug.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-800">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado do Teste de Criação */}
        {creationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(creationResult.success)}
                Teste de Criação de Fatura
              </CardTitle>
              <CardDescription>
                {creationResult.success ? "✅ Criação funcionando" : "❌ Falha na criação"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {creationResult.successful_method && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    ✅ Método funcionando: {creationResult.successful_method}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {creationResult.results.map((result: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{result.method}</h4>
                      {getStatusBadge(result.status, result.success)}
                    </div>

                    {result.response && (
                      <div className="bg-gray-50 rounded p-3 mt-2">
                        <p className="text-sm font-medium mb-1">Resposta:</p>
                        <pre className="text-xs overflow-x-auto max-h-40">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">💡 {creationResult.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
