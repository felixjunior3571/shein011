"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Copy, ExternalLink, Database, Play, Eye, ArrowRight } from "lucide-react"

export default function SetupGuidePage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const sqlScript = `-- Criar tabela payment_webhooks se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificadores
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    token TEXT,
    gateway TEXT NOT NULL DEFAULT 'superpay',
    
    -- Status
    status_code INTEGER NOT NULL DEFAULT 1,
    status_name TEXT,
    status_title TEXT,
    status_description TEXT,
    status_text TEXT,
    
    -- Valores financeiros
    amount DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,
    
    -- Dados de pagamento
    payment_type TEXT DEFAULT 'PIX',
    payment_gateway TEXT,
    payment_date TIMESTAMPTZ,
    payment_due TIMESTAMPTZ,
    
    -- Códigos de pagamento
    qr_code TEXT,
    pix_code TEXT,
    barcode TEXT,
    payment_url TEXT,
    
    -- Flags de status (para facilitar consultas)
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    
    -- Cliente
    customer_id TEXT,
    
    -- Evento
    event_type TEXT DEFAULT 'webhook.update',
    event_date TIMESTAMPTZ,
    
    -- Metadata
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_gateway ON payment_webhooks(external_id, gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);

-- Criar constraint única para evitar duplicatas
ALTER TABLE payment_webhooks 
DROP CONSTRAINT IF EXISTS unique_external_gateway;

ALTER TABLE payment_webhooks 
ADD CONSTRAINT unique_external_gateway 
UNIQUE (external_id, gateway);

-- Habilitar Row Level Security (RLS)
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações
DROP POLICY IF EXISTS "Enable all operations for payment_webhooks" ON payment_webhooks;
CREATE POLICY "Enable all operations for payment_webhooks" ON payment_webhooks
FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;

-- Inserir dados de teste do webhook real que falhou
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    gateway,
    status_code,
    status_name,
    status_title,
    status_description,
    status_text,
    amount,
    payment_type,
    payment_gateway,
    payment_date,
    payment_due,
    qr_code,
    is_paid,
    customer_id,
    event_type,
    event_date,
    webhook_data,
    processed_at,
    updated_at
) VALUES (
    'SHEIN_1751349759845_i6qouytzp',
    '1751350068',
    'superpay',
    5,
    'paid',
    'Pagamento Confirmado!',
    'Obrigado pela sua Compra!',
    'approved',
    27.97,
    'PIX',
    'SuperPay',
    '2025-07-01 03:03:33'::timestamptz,
    '2025-07-02 00:00:00'::timestamptz,
    '00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/f55b76c1-b79c-4a2e-b0e9-6452955c7c795204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***6304C0EE',
    true,
    '138511',
    'webhook.update',
    '2025-07-01 03:03:35'::timestamptz,
    '{"event":{"type":"webhook.update","date":"2025-07-01 03:03:35"},"invoices":{"id":"1751350068","external_id":"SHEIN_1751349759845_i6qouytzp","token":null,"date":"2025-07-01 03:02:42","status":{"code":5,"title":"Pagamento Confirmado!","description":"Obrigado pela sua Compra!","text":"approved"},"customer":138511,"prices":{"total":27.97,"discount":0,"taxs":{"others":0},"refound":null},"type":"PIX","payment":{"gateway":"SuperPay","date":"2025-07-01 03:03:33","due":"2025-07-02 00:00:00","card":null,"payId":null,"payDate":"2025-07-01 03:03:33","details":{"barcode":null,"pix_code":null,"qrcode":"00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/f55b76c1-b79c-4a2e-b0e9-6452955c7c795204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***6304C0EE","url":null}}}}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (external_id, gateway) DO UPDATE SET
    status_code = EXCLUDED.status_code,
    status_name = EXCLUDED.status_name,
    status_title = EXCLUDED.status_title,
    status_description = EXCLUDED.status_description,
    status_text = EXCLUDED.status_text,
    amount = EXCLUDED.amount,
    payment_date = EXCLUDED.payment_date,
    qr_code = EXCLUDED.qr_code,
    is_paid = EXCLUDED.is_paid,
    webhook_data = EXCLUDED.webhook_data,
    updated_at = NOW();

-- Verificar se os dados foram inseridos
SELECT 
    external_id,
    status_code,
    status_title,
    amount,
    is_paid,
    processed_at
FROM payment_webhooks 
WHERE external_id = 'SHEIN_1751349759845_i6qouytzp'
ORDER BY processed_at DESC;

COMMIT;`

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  const markStepComplete = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
  }

  const steps = [
    {
      id: 1,
      title: "Executar SQL Script no Supabase",
      description: "Criar a tabela payment_webhooks no banco de dados",
      icon: Database,
      color: "blue",
    },
    {
      id: 2,
      title: "Testar Interface Manual",
      description: "Processar o webhook que falhou",
      icon: Play,
      color: "green",
    },
    {
      id: 3,
      title: "Verificar Checkout",
      description: "Testar a página de checkout com Realtime",
      icon: Eye,
      color: "purple",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Guia de Configuração</h1>
          <p className="text-gray-600">Siga estes passos para configurar o sistema de webhooks</p>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso da Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      completedSteps.includes(step.id)
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && <ArrowRight className="h-4 w-4 mx-4 text-gray-400" />}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              {completedSteps.length} de {steps.length} passos concluídos
            </div>
          </CardContent>
        </Card>

        {/* Step 1: SQL Script */}
        <Card className={currentStep === 1 ? "border-blue-500 border-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Passo 1: Executar SQL Script no Supabase
              {completedSteps.includes(1) && <CheckCircle className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>Vamos criar a tabela payment_webhooks no seu banco de dados Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Instruções detalhadas:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Acesse o painel do Supabase (supabase.com)</li>
                    <li>Vá para o seu projeto</li>
                    <li>Clique em "SQL Editor" no menu lateral</li>
                    <li>Clique em "New Query"</li>
                    <li>Cole o script SQL abaixo</li>
                    <li>Clique em "Run" (ou pressione Ctrl+Enter)</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Script SQL Completo:</span>
                  <Button
                    onClick={() => copyToClipboard(sqlScript, "sql")}
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                  >
                    {copied === "sql" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === "sql" ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
                <pre className="text-xs bg-white p-3 rounded border max-h-64 overflow-auto">{sqlScript}</pre>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setCurrentStep(1)
                    markStepComplete(1)
                    setCurrentStep(2)
                  }}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Marquei como Concluído
                </Button>
                <Button
                  onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
                  variant="outline"
                  className="bg-transparent"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Supabase
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Test Interface */}
        <Card className={currentStep === 2 ? "border-green-500 border-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              Passo 2: Testar Interface Manual
              {completedSteps.includes(2) && <CheckCircle className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>Agora vamos testar se o webhook está funcionando corretamente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Play className="h-4 w-4" />
                <AlertDescription>
                  <strong>O que fazer:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Clique no botão "Ir para Teste Manual" abaixo</li>
                    <li>Na nova página, clique em "Processar Webhook"</li>
                    <li>Aguarde o processamento (deve mostrar sucesso)</li>
                    <li>Clique em "Verificar Dados" para ver se foi salvo</li>
                    <li>Volte aqui e marque como concluído</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Resultado Esperado:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✅ Webhook processado com sucesso</li>
                  <li>✅ External ID: SHEIN_1751349759845_i6qouytzp</li>
                  <li>✅ Status: Pagamento Confirmado!</li>
                  <li>✅ Valor: R$ 27.97</li>
                  <li>✅ Dados salvos no Supabase</li>
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.open("/debug/manual-webhook-test", "_blank")}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ir para Teste Manual
                </Button>
                <Button
                  onClick={() => {
                    markStepComplete(2)
                    setCurrentStep(3)
                  }}
                  variant="outline"
                  className="bg-transparent"
                  disabled={!completedSteps.includes(1)}
                >
                  Marquei como Concluído
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Test Checkout */}
        <Card className={currentStep === 3 ? "border-purple-500 border-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              Passo 3: Verificar Checkout com Realtime
              {completedSteps.includes(3) && <CheckCircle className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>Testar se a página de checkout detecta o pagamento em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como testar:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Clique no botão "Ir para Checkout" abaixo</li>
                    <li>A página deve carregar com o External ID correto</li>
                    <li>Deve mostrar "Pagamento Confirmado!" em verde</li>
                    <li>O Realtime deve estar "Conectado"</li>
                    <li>Deve redirecionar automaticamente para /upp/001</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">O que você deve ver:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>✅ External ID: SHEIN_1751349759845_i6qouytzp</li>
                  <li>✅ Status: "Pagamento Confirmado!"</li>
                  <li>✅ Valor: R$ 27.97</li>
                  <li>✅ Conexão Realtime: "Conectado"</li>
                  <li>✅ Redirecionamento automático após alguns segundos</li>
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.open("/checkout?external_id=SHEIN_1751349759845_i6qouytzp", "_blank")}
                  className="bg-purple-500 hover:bg-purple-600"
                  disabled={!completedSteps.includes(2)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ir para Checkout
                </Button>
                <Button
                  onClick={() => markStepComplete(3)}
                  variant="outline"
                  className="bg-transparent"
                  disabled={!completedSteps.includes(2)}
                >
                  Marquei como Concluído
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {completedSteps.length === 3 && (
          <Card className="border-green-500 border-2 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">🎉 Configuração Concluída!</h2>
              <p className="text-green-700 mb-4">Parabéns! O sistema de webhooks está funcionando perfeitamente.</p>
              <div className="space-y-2 text-sm text-green-600">
                <p>✅ Tabela payment_webhooks criada no Supabase</p>
                <p>✅ Webhook SuperPay processando corretamente</p>
                <p>✅ Realtime funcionando e detectando pagamentos</p>
                <p>✅ Redirecionamento automático configurado</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>❓ Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Erro no SQL Script?</strong>
                <p className="text-gray-600">
                  Verifique se você tem permissões de administrador no Supabase e se o projeto está ativo.
                </p>
              </div>
              <div>
                <strong>Webhook não funciona?</strong>
                <p className="text-gray-600">
                  Verifique se as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configuradas.
                </p>
              </div>
              <div>
                <strong>Realtime não conecta?</strong>
                <p className="text-gray-600">
                  Certifique-se de que a tabela payment_webhooks foi criada e que o Realtime está habilitado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
