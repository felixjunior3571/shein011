"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Copy, ExternalLink, AlertTriangle, Zap } from "lucide-react"
import Link from "next/link"

export default function SetupGuidePage() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  const sqlScript = `-- =====================================================
-- SCRIPT COMPLETO PARA CONFIGURAR WEBHOOKS SUPERPAY
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela payment_webhooks
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    token TEXT,
    gateway TEXT NOT NULL DEFAULT 'superpaybr',
    status_code INTEGER,
    status_name TEXT,
    status_title TEXT,
    status_description TEXT,
    status_text TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMPTZ,
    payment_due TIMESTAMPTZ,
    payment_gateway TEXT,
    qr_code TEXT,
    pix_code TEXT,
    barcode TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON public.payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON public.payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON public.payment_webhooks(is_paid, is_denied, is_expired, is_canceled);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_updated_at ON public.payment_webhooks(updated_at DESC);

-- 3. Criar constraint única para evitar duplicatas
ALTER TABLE public.payment_webhooks 
ADD CONSTRAINT unique_external_id_gateway 
UNIQUE (external_id, gateway);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS para permitir leitura pública
CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.payment_webhooks
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public insert access" ON public.payment_webhooks
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public update access" ON public.payment_webhooks
    FOR UPDATE USING (true);

-- 6. Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_webhooks;

-- 7. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON public.payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON public.payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SCRIPT EXECUTADO COM SUCESSO!
-- Agora você pode testar o sistema de webhooks
-- =====================================================`

  const copyToClipboard = async (text: string, step: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStep(step)
      setTimeout(() => setCopiedStep(null), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  const steps = [
    {
      id: 1,
      title: "Execute o Script SQL",
      description: "Cole e execute o script completo no Supabase SQL Editor",
      action: "Copiar Script SQL",
      link: "https://supabase.com/dashboard/project/YOUR_PROJECT/sql",
      status: "critical",
    },
    {
      id: 2,
      title: "Verificar Sistema",
      description: "Execute a verificação automática para confirmar que tudo está funcionando",
      action: "Abrir Verificação",
      link: "/debug/system-check",
      status: "important",
    },
    {
      id: 3,
      title: "Testar Webhook Manual",
      description: "Teste o webhook manualmente para simular um pagamento",
      action: "Abrir Teste",
      link: "/debug/manual-webhook-test",
      status: "test",
    },
    {
      id: 4,
      title: "Testar Checkout Real",
      description: "Teste o checkout completo com Realtime funcionando",
      action: "Abrir Checkout",
      link: "/checkout?amount=27.97&shipping=sedex&method=SEDEX",
      status: "final",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl text-blue-900">Guia de Configuração SuperPay</CardTitle>
                <p className="text-blue-700 mt-1">
                  Sistema 100% baseado em webhooks - SEM polling para evitar rate limit
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Aviso Importante */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600 mt-1" />
              <div>
                <h3 className="font-bold text-orange-900 mb-2">⚠️ IMPORTANTE - Rate Limiting SuperPay</h3>
                <div className="text-orange-800 space-y-2">
                  <p>
                    • A SuperPay tem rate limiting severo: 5min → 30min → 1h → 12h → 24h → 48h → 100h → BLOQUEIO
                    PERMANENTE
                  </p>
                  <p>• O sistema agora é 100% baseado em webhooks - NÃO fazemos consultas desnecessárias</p>
                  <p>• Apenas UMA verificação inicial no banco local, depois só escutamos os webhooks via Realtime</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <Card key={step.id} className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                      {step.id}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        step.status === "critical"
                          ? "destructive"
                          : step.status === "important"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {step.status === "critical" && "CRÍTICO"}
                      {step.status === "important" && "IMPORTANTE"}
                      {step.status === "test" && "TESTE"}
                      {step.status === "final" && "FINAL"}
                    </Badge>
                    {step.id === 1 ? (
                      <Button
                        onClick={() => copyToClipboard(sqlScript, step.id)}
                        variant={copiedStep === step.id ? "default" : "outline"}
                        className="flex items-center gap-2"
                      >
                        {copiedStep === step.id ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            {step.action}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="flex items-center gap-2 bg-transparent">
                        <Link href={step.link}>
                          <ExternalLink className="h-4 w-4" />
                          {step.action}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SQL Script Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Script SQL Completo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
              <pre>{sqlScript}</pre>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Este script cria a tabela, índices, RLS, Realtime e triggers necessários
              </p>
              <Button
                onClick={() => copyToClipboard(sqlScript, 0)}
                variant={copiedStep === 0 ? "default" : "outline"}
                size="sm"
              >
                {copiedStep === 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Script
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Como Funciona */}
        <Card>
          <CardHeader>
            <CardTitle>🔄 Como Funciona o Sistema Otimizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600">✅ O que fazemos AGORA:</h4>
                <ul className="space-y-2 text-sm">
                  <li>• 1 verificação inicial no banco local</li>
                  <li>• Escutamos webhooks via Realtime</li>
                  <li>• Redirecionamento automático quando pago</li>
                  <li>• Zero consultas à API SuperPay</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-red-600">❌ O que NÃO fazemos mais:</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Polling/consultas constantes</li>
                  <li>• Múltiplas chamadas à API</li>
                  <li>• Cron jobs infinitos</li>
                  <li>• Rate limiting triggers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links Rápidos */}
        <Card>
          <CardHeader>
            <CardTitle>🔗 Links Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <Link href="/debug/system-check" className="flex flex-col items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  <span>Verificação do Sistema</span>
                  <span className="text-xs text-gray-500">Diagnóstico automático</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 bg-transparent">
                <Link href="/debug/manual-webhook-test" className="flex flex-col items-center gap-2">
                  <Zap className="h-6 w-6" />
                  <span>Teste Manual</span>
                  <span className="text-xs text-gray-500">Simular webhook</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
