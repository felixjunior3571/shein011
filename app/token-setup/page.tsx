"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  Settings,
  Key,
  TestTube,
} from "lucide-react"

interface SetupGuide {
  title: string
  current_status: {
    token_configured: boolean
    token_length: number
    api_url_configured: boolean
    secret_key_configured: boolean
    webhook_configured: boolean
  }
  steps: Array<{
    step: number
    title: string
    description: string
    action: string
    variables?: Array<{
      name: string
      description: string
      example: string
    }>
  }>
  common_issues: Array<{
    issue: string
    solution: string
  }>
  next_steps: string[]
}

interface TokenValidation {
  token_info: {
    length: number
    preview: string
    has_secret_key: boolean
  }
  test_results: Array<{
    method: string
    status: number
    success: boolean
    response: string
  }>
  working_methods: Array<{
    method: string
    status: number
    success: boolean
  }>
  recommendations: string[]
}

export default function TokenSetupPage() {
  const [setupGuide, setSetupGuide] = useState<SetupGuide | null>(null)
  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const loadSetupGuide = async () => {
    try {
      const response = await fetch("/api/tryplopay/setup-guide")
      const data = await response.json()
      setSetupGuide(data)
    } catch (error) {
      console.error("Erro ao carregar guia:", error)
    }
  }

  const validateToken = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tryplopay/token-validator")
      const data = await response.json()
      setTokenValidation(data)
    } catch (error) {
      console.error("Erro ao validar token:", error)
    } finally {
      setLoading(false)
    }
  }

  const testTokenCreation = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tryplopay/token-validator", {
        method: "POST",
      })
      const data = await response.json()
      console.log("Teste de criação:", data)
      alert(data.success ? "✅ Teste de criação bem-sucedido!" : "❌ Teste de criação falhou")
    } catch (error) {
      console.error("Erro no teste:", error)
      alert("❌ Erro no teste de criação")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  useEffect(() => {
    loadSetupGuide()
    validateToken()
  }, [])

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />
  }

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {label}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Configuração TryploPay</h1>
          <p className="text-gray-600">Configure corretamente o token da TryploPay para PIX real</p>
        </div>

        {/* Status Atual */}
        {setupGuide && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Status da Configuração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getStatusBadge(setupGuide.current_status.token_configured, "Token")}
                {getStatusBadge(setupGuide.current_status.api_url_configured, "API URL")}
                {getStatusBadge(setupGuide.current_status.secret_key_configured, "Secret Key")}
                {getStatusBadge(setupGuide.current_status.webhook_configured, "Webhook")}
              </div>
              {setupGuide.current_status.token_configured && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Token configurado com {setupGuide.current_status.token_length} caracteres
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Validação do Token */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-6 h-6" />
              Validação do Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Button onClick={validateToken} disabled={loading} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Validar Token
              </Button>
              <Button
                onClick={testTokenCreation}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                <TestTube className="w-4 h-4" />
                Teste de Criação
              </Button>
            </div>

            {tokenValidation && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Informações do Token:</h3>
                  <div className="text-sm space-y-1">
                    <div>Comprimento: {tokenValidation.token_info.length} caracteres</div>
                    <div>Preview: {tokenValidation.token_info.preview}</div>
                    <div>Secret Key: {tokenValidation.token_info.has_secret_key ? "✅" : "❌"}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Resultados dos Testes:</h3>
                  {tokenValidation.test_results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.method}</span>
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.status} {result.success ? "✅" : "❌"}
                        </Badge>
                      </div>
                      {result.response && <div className="text-xs text-gray-600 mt-1 font-mono">{result.response}</div>}
                    </div>
                  ))}
                </div>

                {tokenValidation.recommendations.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {tokenValidation.recommendations.map((rec, index) => (
                          <div key={index}>{rec}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guia de Configuração */}
        {setupGuide && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>📋 Guia Passo a Passo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {setupGuide.steps.map((step) => (
                  <div key={step.step} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-lg mb-2">
                      {step.step}. {step.title}
                    </h3>
                    <p className="text-gray-600 mb-2">{step.description}</p>
                    <p className="text-blue-600 font-medium mb-3">{step.action}</p>

                    {step.variables && (
                      <div className="space-y-2">
                        {step.variables.map((variable) => (
                          <div key={variable.name} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold">{variable.name}</span>
                              <Button
                                onClick={() => copyToClipboard(variable.example, variable.name)}
                                variant="outline"
                                size="sm"
                              >
                                {copied === variable.name ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{variable.description}</p>
                            <code className="text-xs bg-white p-1 rounded border">{variable.example}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problemas Comuns */}
        {setupGuide && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>🔧 Problemas Comuns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {setupGuide.common_issues.map((issue, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-800 mb-1">❌ {issue.issue}</h3>
                    <p className="text-yellow-700 text-sm">✅ {issue.solution}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links Úteis */}
        <Card>
          <CardHeader>
            <CardTitle>🔗 Links Úteis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <a
                  href="https://dashboard.tryplopay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-start"
                >
                  <ExternalLink className="w-5 h-5 mb-2" />
                  <div className="font-medium">Dashboard TryploPay</div>
                  <div className="text-sm text-gray-600">Gerar novo token</div>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-start"
                >
                  <ExternalLink className="w-5 h-5 mb-2" />
                  <div className="font-medium">Vercel Dashboard</div>
                  <div className="text-sm text-gray-600">Configurar variáveis</div>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <a href="/checkout" className="flex flex-col items-start">
                  <TestTube className="w-5 h-5 mb-2" />
                  <div className="font-medium">Testar Checkout</div>
                  <div className="text-sm text-gray-600">Verificar funcionamento</div>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
