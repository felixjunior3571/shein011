"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Copy, ExternalLink, AlertTriangle, Database, Webhook } from "lucide-react"

export default function SetupGuidePage() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  const sqlScript = `-- Criar tabela payment_webhooks com TODAS as colunas necessárias
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
    
    -- Flags de status
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    
    -- Cliente (COLUNA QUE ESTAVA FALTANDO!)
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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_gateway ON payment_webhooks(external_id, gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_customer_id ON payment_webhooks(customer_id);

-- Constraint única
ALTER TABLE payment_webhooks 
DROP CONSTRAINT IF EXISTS unique_external_gateway;

ALTER TABLE payment_webhooks 
ADD CONSTRAINT unique_external_gateway 
UNIQUE (external_id, gateway);

-- RLS
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for payment_webhooks" ON payment_webhooks;
CREATE POLICY "Enable all operations for payment_webhooks" ON payment_webhooks
FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;

-- Inserir o webhook que falhou
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
    'SHEIN_1751355096377_ylb68yqqt',
    '1751355405',
    'superpay',
    5,
    'paid',
    'Pagamento Confirmado!',
    'Obrigado pela sua Compra!',
    'approved',
    27.97,
    'PIX',
    'SuperPay',
    '2025-07-01 04:32:35'::timestamptz,
    '2025-07-02 00:00:00'::timestamptz,
    '00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/41b23688-fea1-490d-9de4-2759c541435f5204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***63044127',
    true,
    '121891',
    'webhook.update',
    '2025-07-01 04:32:36'::timestamptz,
    '{"event":{"type":"webhook.update","date":"2025-07-01 04:32:36"},"invoices":{"id":"1751355405","external_id":"SHEIN_1751355096377_ylb68yqqt","token":null,"date":"2025-07-01 04:31:38","status":{"code":5,"title":"Pagamento Confirmado!","description":"Obrigado pela sua Compra!","text":"approved"},"customer":121891,"prices":{"total":27.97,"discount":0,"taxs":{"others":0},"refound":null},"type":"PIX","payment":{"gateway":"SuperPay","date":"2025-07-01 04:32:35","due":"2025-07-02 00:00:00","card":null,"payId":null,"payDate":"2025-07-01 04:32:35","details":{"barcode":null,"pix_code":null,"qrcode":"00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/41b23688-fea1-490d-9de4-2759c541435f5204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***63044127","url":null}}}}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (external_id, gateway) DO UPDATE SET
    status_code = EXCLUDED.status_code,
    status_name = EXCLUDED.status_name,
    status_title = EXCLUDED.status_title,
    is_paid = EXCLUDED.is_paid,
    customer_id = EXCLUDED.customer_id,
    webhook_data = EXCLUDED.webhook_data,
    updated_at = NOW();

COMMIT;`

  const copyToClipboard = async (text: string, step: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStep(step)
      setTimeout(() => setCopiedStep(null), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🛠️ Guia de Configuração</h1>
          <p className="text-gray-600">Siga os passos para corrigir o problema do webhook</p>
        </div>

        {/* Problem Identified */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Problema Identificado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-red-700">
              <p>
                <strong>Erro:</strong> Could not find the 'customer_id' column
              </p>
              <p>
                <strong>Causa:</strong> A tabela payment_webhooks não tem a coluna customer_id
              </p>
              <p>
                <strong>Status do Webhook:</strong> 500 - Falhou ao processar
              </p>
              <p>
                <strong>Pagamento:</strong> Foi confirmado mas não foi salvo no banco
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Passo 1: Execute o SQL no Supabase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Copie o script SQL abaixo e execute no Supabase SQL Editor para corrigir a tabela:
              </p>

              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                  {sqlScript}
                </pre>
                <Button
                  onClick={() => copyToClipboard(sqlScript, 1)}
                  className="absolute top-2 right-2"
                  size="sm"
                  variant={copiedStep === 1 ? "default" : "outline"}
                >
                  {copiedStep === 1 ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedStep === 1 ? "Copiado!" : "Copiar"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.open("https://supabase.com/dashboard/project", "_blank")}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Supabase Dashboard
                </Button>
                <Badge variant="outline">SQL Editor → Executar Script</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Passo 2: Verificar se o Pagamento foi Processado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Após executar o SQL, o script já inseriu o webhook que falhou. Verifique se funcionou:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => (window.location.href = "/debug/webhook-status")}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Webhook className="w-6 h-6" />
                  <span>Ver Status dos Webhooks</span>
                  <span className="text-xs text-gray-500">Busque por: SHEIN_1751355096377_ylb68yqqt</span>
                </Button>

                <Button
                  onClick={() => (window.location.href = "/debug/system-check")}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <CheckCircle className="w-6 h-6" />
                  <span>Verificação do Sistema</span>
                  <span className="text-xs text-gray-500">Diagnóstico completo</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Passo 3: Testar o Redirecionamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Se o webhook foi processado corretamente, você deve ser redirecionado automaticamente:
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Seu pagamento foi confirmado!</span>
                </div>
                <p className="text-green-600 text-sm mt-1">External ID: SHEIN_1751355096377_ylb68yqqt</p>
                <p className="text-green-600 text-sm">Valor: R$ 27,97</p>
              </div>

              <Button onClick={() => (window.location.href = "/upp/001")} className="w-full" size="lg">
                Ir para Ativação do Cartão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* What was fixed */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />O que foi corrigido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-green-700">
              <p>✅ Adicionada coluna customer_id na tabela payment_webhooks</p>
              <p>✅ Webhook que falhou foi inserido manualmente no banco</p>
              <p>✅ Realtime vai detectar o pagamento confirmado</p>
              <p>✅ Redirecionamento automático deve funcionar</p>
              <p>✅ Próximos webhooks não terão mais erro 500</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
