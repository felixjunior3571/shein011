"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Database, Webhook } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface SystemCheck {
  name: string
  status: "checking" | "success" | "error" | "warning"
  message: string
  details?: string
  action?: string
}

export default function SystemCheckPage() {
  const [checks, setChecks] = useState<SystemCheck[]>([
    { name: "Conexão Supabase", status: "checking", message: "Verificando..." },
    { name: "Tabela payment_webhooks", status: "checking", message: "Verificando..." },
    { name: "Coluna customer_id", status: "checking", message: "Verificando..." },
    { name: "Webhook do Pagamento", status: "checking", message: "Verificando..." },
    { name: "Realtime", status: "checking", message: "Verificando..." },
  ])

  const [isRunning, setIsRunning] = useState(false)

  const updateCheck = (
    name: string,
    status: SystemCheck["status"],
    message: string,
    details?: string,
    action?: string,
  ) => {
    setChecks((prev) =>
      prev.map((check) => (check.name === name ? { ...check, status, message, details, action } : check)),
    )
  }

  const runSystemCheck = async () => {
    setIsRunning(true)

    // Reset all checks
    setChecks((prev) => prev.map((check) => ({ ...check, status: "checking", message: "Verificando..." })))

    try {
      // 1. Verificar conexão Supabase
      updateCheck("Conexão Supabase", "checking", "Testando conexão...")

      const { data: connectionTest, error: connectionError } = await supabase
        .from("payment_webhooks")
        .select("count")
        .limit(1)

      if (connectionError) {
        updateCheck(
          "Conexão Supabase",
          "error",
          "Erro na conexão",
          connectionError.message,
          "Verifique as variáveis de ambiente",
        )
      } else {
        updateCheck("Conexão Supabase", "success", "Conectado com sucesso")
      }

      // 2. Verificar se tabela existe
      updateCheck("Tabela payment_webhooks", "checking", "Verificando estrutura...")

      const { data: tableCheck, error: tableError } = await supabase.from("payment_webhooks").select("*").limit(1)

      if (tableError && tableError.code === "42P01") {
        updateCheck(
          "Tabela payment_webhooks",
          "error",
          "Tabela não existe",
          "Execute o script SQL para criar a tabela",
          "Executar SQL",
        )
      } else if (tableError) {
        updateCheck("Tabela payment_webhooks", "error", "Erro na tabela", tableError.message)
      } else {
        updateCheck("Tabela payment_webhooks", "success", "Tabela existe e acessível")
      }

      // 3. Verificar coluna customer_id
      updateCheck("Coluna customer_id", "checking", "Verificando colunas...")

      try {
        const { data: columnCheck, error: columnError } = await supabase
          .from("payment_webhooks")
          .select("customer_id")
          .limit(1)

        if (columnError && columnError.code === "PGRST204") {
          updateCheck(
            "Coluna customer_id",
            "error",
            "Coluna customer_id não existe",
            "Esta é a causa do erro 500 no webhook",
            "Executar SQL",
          )
        } else if (columnError) {
          updateCheck("Coluna customer_id", "error", "Erro ao verificar coluna", columnError.message)
        } else {
          updateCheck("Coluna customer_id", "success", "Coluna customer_id existe")
        }
      } catch (error) {
        updateCheck("Coluna customer_id", "error", "Erro ao verificar coluna", String(error))
      }

      // 4. Verificar webhook específico
      updateCheck("Webhook do Pagamento", "checking", "Buscando webhook...")

      const { data: webhookCheck, error: webhookError } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", "SHEIN_1751355096377_ylb68yqqt")

      if (webhookError) {
        updateCheck("Webhook do Pagamento", "error", "Erro ao buscar webhook", webhookError.message)
      } else if (!webhookCheck || webhookCheck.length === 0) {
        updateCheck(
          "Webhook do Pagamento",
          "warning",
          "Webhook não encontrado",
          "O webhook do seu pagamento não foi salvo no banco",
          "Executar SQL",
        )
      } else {
        const webhook = webhookCheck[0]
        if (webhook.is_paid) {
          updateCheck(
            "Webhook do Pagamento",
            "success",
            "Pagamento confirmado!",
            `Valor: R$ ${webhook.amount} - Status: ${webhook.status_title}`,
          )
        } else {
          updateCheck("Webhook do Pagamento", "warning", "Pagamento pendente", `Status: ${webhook.status_title}`)
        }
      }

      // 5. Verificar Realtime
      updateCheck("Realtime", "checking", "Testando Realtime...")

      const channel = supabase
        .channel("system_check")
        .on("postgres_changes", { event: "*", schema: "public", table: "payment_webhooks" }, () => {
          // Test listener
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            updateCheck("Realtime", "success", "Realtime funcionando")
            supabase.removeChannel(channel)
          } else if (status === "CHANNEL_ERROR") {
            updateCheck("Realtime", "error", "Erro no Realtime", "Falha na conexão")
            supabase.removeChannel(channel)
          }
        })

      // Timeout para Realtime
      setTimeout(() => {
        supabase.removeChannel(channel)
        updateCheck("Realtime", "warning", "Timeout no Realtime", "Conexão demorou muito")
      }, 10000)
    } catch (error) {
      console.error("Erro na verificação:", error)
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    runSystemCheck()
  }, [])

  const getStatusIcon = (status: SystemCheck["status"]) => {
    switch (status) {
      case "checking":
        return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
    }
  }

  const getStatusColor = (status: SystemCheck["status"]) => {
    switch (status) {
      case "checking":
        return "border-blue-200 bg-blue-50"
      case "success":
        return "border-green-200 bg-green-50"
      case "error":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-orange-200 bg-orange-50"
    }
  }

  const hasErrors = checks.some((check) => check.status === "error")
  const hasWarnings = checks.some((check) => check.status === "warning")
  const allSuccess = checks.every((check) => check.status === "success")

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🔍 Verificação do Sistema</h1>
          <p className="text-gray-600">Diagnóstico completo do sistema de webhooks</p>
        </div>

        {/* Overall Status */}
        <Card
          className={`border-2 ${allSuccess ? "border-green-200 bg-green-50" : hasErrors ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {allSuccess ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : hasErrors ? (
                  <XCircle className="w-8 h-8 text-red-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                )}
                <div>
                  <h2 className="text-xl font-bold">
                    {allSuccess ? "Sistema OK" : hasErrors ? "Problemas Encontrados" : "Atenção Necessária"}
                  </h2>
                  <p className="text-gray-600">
                    {allSuccess
                      ? "Todos os componentes estão funcionando"
                      : hasErrors
                        ? "Alguns componentes precisam de correção"
                        : "Alguns componentes precisam de atenção"}
                  </p>
                </div>
              </div>
              <Button onClick={runSystemCheck} disabled={isRunning} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                Verificar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Individual Checks */}
        <div className="space-y-4">
          {checks.map((check, index) => (
            <Card key={index} className={`border ${getStatusColor(check.status)}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{check.name}</h3>
                    <p className="text-gray-600">{check.message}</p>
                    {check.details && <p className="text-sm text-gray-500 mt-1">{check.details}</p>}
                  </div>
                  {check.action && (
                    <Badge variant="outline" className="text-xs">
                      {check.action}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Ações Recomendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/debug/setup-guide")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Database className="w-6 h-6" />
                <span>Executar SQL</span>
                <span className="text-xs text-gray-500">Corrigir tabela</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => (window.location.href = "/debug/webhook-status")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Webhook className="w-6 h-6" />
                <span>Ver Webhooks</span>
                <span className="text-xs text-gray-500">Status em tempo real</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => (window.location.href = "/upp/001")}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <CheckCircle className="w-6 h-6" />
                <span>Ativar Cartão</span>
                <span className="text-xs text-gray-500">Seu pagamento foi confirmado</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
