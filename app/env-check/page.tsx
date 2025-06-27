"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink } from "lucide-react"

interface EnvStatus {
  timestamp: string
  message: string
  variables: {
    [key: string]: {
      exists: boolean
      value: string
      length?: number
      preview?: string
    }
  }
  instructions: {
    [key: string]: string
  }
  ready_for_production: boolean
}

export default function EnvCheckPage() {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const checkEnvironment = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/env-setup")
      const data = await response.json()
      setEnvStatus(data)
    } catch (error) {
      console.error("Erro ao verificar ambiente:", error)
    } finally {
      setLoading(false)
    }
  }

  const forceCheck = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/env-setup", { method: "POST" })
      const data = await response.json()
      console.log("Force check result:", data)
      // Após force check, verificar novamente
      await checkEnvironment()
    } catch (error) {
      console.error("Erro no force check:", error)
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
    checkEnvironment()
  }, [])

  const getStatusIcon = (exists: boolean) => {
    return exists ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />
  }

  const getStatusBadge = (exists: boolean) => {
    return (
      <Badge variant={exists ? "default" : "destructive"}>{exists ? "✅ Configurado" : "❌ Não Configurado"}</Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verificação de Ambiente</h1>
          <p className="text-gray-600">Status das variáveis de ambiente do TryploPay</p>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-4 mb-8">
          <Button onClick={checkEnvironment} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Verificar Novamente
          </Button>
          <Button
            onClick={forceCheck}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
          >
            <AlertTriangle className="w-4 h-4" />
            Force Check
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Vercel
            </a>
          </Button>
        </div>

        {/* Status Geral */}
        {envStatus && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {envStatus.ready_for_production ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                Status Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium mb-2">{envStatus.message}</div>
              <div className="text-sm text-gray-600">
                Última verificação: {new Date(envStatus.timestamp).toLocaleString("pt-BR")}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Variáveis de Ambiente */}
        {envStatus && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Variáveis de Ambiente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(envStatus.variables).map(([key, variable]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(variable.exists)}
                      <div>
                        <div className="font-medium">{key}</div>
                        <div className="text-sm text-gray-600">
                          {variable.exists ? (
                            <>
                              Valor: {variable.preview || variable.value}
                              {variable.length && ` (${variable.length} caracteres)`}
                            </>
                          ) : (
                            "Não configurado"
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(variable.exists)}
                      {!variable.exists && (
                        <Button onClick={() => copyToClipboard(getCorrectValue(key), key)} variant="outline" size="sm">
                          {copied === key ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções de Configuração */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📋 Instruções de Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-800 mb-2">1. Acesse o Vercel Dashboard</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Vá para{" "}
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    vercel.com/dashboard
                  </a>
                </p>
                <p className="text-blue-700 text-sm">Selecione seu projeto → Settings → Environment Variables</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-bold text-yellow-800 mb-2">2. Adicione as Variáveis</h3>
                <div className="space-y-2">
                  {getEnvironmentVariables().map((env) => (
                    <div key={env.name} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="font-mono text-sm">
                        <strong>{env.name}=</strong>
                        {env.value}
                      </div>
                      <Button
                        onClick={() => copyToClipboard(`${env.name}=${env.value}`, env.name)}
                        variant="outline"
                        size="sm"
                      >
                        {copied === env.name ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-800 mb-2">3. Configuração no Vercel</h3>
                <ul className="text-green-700 text-sm space-y-1 list-disc list-inside">
                  <li>Para cada variável, clique em "Add New"</li>
                  <li>Cole o nome da variável no campo "Name"</li>
                  <li>Cole o valor no campo "Value"</li>
                  <li>Selecione todos os ambientes: Production, Preview, Development</li>
                  <li>Clique em "Save"</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-800 mb-2">4. Após Configurar</h3>
                <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
                  <li>Faça um novo deploy (ou aguarde alguns minutos)</li>
                  <li>Clique em "Verificar Novamente" nesta página</li>
                  <li>Teste o PIX em /checkout</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links Úteis */}
        <Card>
          <CardHeader>
            <CardTitle>🔗 Links Úteis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <a href="/api/env-setup" target="_blank" className="flex flex-col items-start" rel="noreferrer">
                  <div className="font-medium">API de Verificação</div>
                  <div className="text-sm text-gray-600">/api/env-setup</div>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <a href="/checkout" className="flex flex-col items-start">
                  <div className="font-medium">Testar Checkout</div>
                  <div className="text-sm text-gray-600">/checkout</div>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <a
                  href="/api/tryplopay/test-connection"
                  target="_blank"
                  className="flex flex-col items-start"
                  rel="noreferrer"
                >
                  <div className="font-medium">Teste de Conexão</div>
                  <div className="text-sm text-gray-600">/api/tryplopay/test-connection</div>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  className="flex flex-col items-start"
                  rel="noreferrer"
                >
                  <div className="font-medium">Vercel Dashboard</div>
                  <div className="text-sm text-gray-600">vercel.com/dashboard</div>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Função para obter o valor correto de cada variável
function getCorrectValue(key: string): string {
  const values = {
    TRYPLOPAY_TOKEN: "WmCVLneePWrUMgJ",
    TRYPLOPAY_API_URL: "https://api.tryplopay.com",
    TRYPLOPAY_SECRET_KEY: "V21DVkxuZWVQV3JVTWdKOjoxNzQ2MDUxMjIz",
    TRYPLOPAY_WEBHOOK_URL: "https://v0-copy-shein-website.vercel.app/api/tryplopay/webhook",
  }
  return values[key as keyof typeof values] || ""
}

// Função para obter todas as variáveis de ambiente
function getEnvironmentVariables() {
  return [
    {
      name: "TRYPLOPAY_TOKEN",
      value: "WmCVLneePWrUMgJ",
    },
    {
      name: "TRYPLOPAY_API_URL",
      value: "https://api.tryplopay.com",
    },
    {
      name: "TRYPLOPAY_SECRET_KEY",
      value: "V21DVkxuZWVQV3JVTWdKOjoxNzQ2MDUxMjIz",
    },
    {
      name: "TRYPLOPAY_WEBHOOK_URL",
      value: "https://v0-copy-shein-website.vercel.app/api/tryplopay/webhook",
    },
  ]
}
