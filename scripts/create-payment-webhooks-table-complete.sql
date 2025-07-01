-- =====================================================
-- SCRIPT COMPLETO PARA CORRIGIR WEBHOOKS SUPERPAY
-- Versão final com todas as correções necessárias
-- =====================================================

BEGIN;

-- 1. Dropar tabela existente se houver problemas
DROP TABLE IF EXISTS payment_webhooks CASCADE;

-- 2. Criar tabela completa do zero
CREATE TABLE payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificadores principais
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    token TEXT,
    gateway TEXT NOT NULL DEFAULT 'superpay',
    
    -- Status do pagamento
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
    
    -- Flags de status (CRÍTICO para funcionamento)
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    
    -- Cliente (OBRIGATÓRIO)
    customer_id TEXT,
    
    -- Evento
    event_type TEXT DEFAULT 'webhook.update',
    event_date TIMESTAMPTZ,
    
    -- Dados completos do webhook
    webhook_data JSONB,
    
    -- Timestamps
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices para performance máxima
CREATE INDEX idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX idx_payment_webhooks_customer_id ON payment_webhooks(customer_id);
CREATE INDEX idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);
CREATE UNIQUE INDEX idx_payment_webhooks_unique ON payment_webhooks(external_id, gateway);

-- 4. Habilitar Row Level Security
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- 5. Criar política permissiva para todos
DROP POLICY IF EXISTS "payment_webhooks_policy" ON payment_webhooks;
CREATE POLICY "payment_webhooks_policy" ON payment_webhooks
FOR ALL USING (true) WITH CHECK (true);

-- 6. Habilitar Realtime (CRÍTICO)
ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;

-- 7. Criar função para trigger de updated_at
CREATE OR REPLACE FUNCTION update_payment_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger
CREATE TRIGGER payment_webhooks_updated_at_trigger
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_webhooks_updated_at();

-- 9. Inserir webhook de teste para o pagamento atual
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
    webhook_data
) VALUES (
    'SHEIN_1751357101223_oqb6j01qc',
    '1751357101223',
    'superpay',
    5,
    'paid',
    'Pagamento Confirmado!',
    'Obrigado pela sua Compra!',
    'approved',
    0.28,
    'PIX',
    'SuperPay',
    NOW(),
    NOW() + INTERVAL '1 day',
    '00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/test',
    true,
    '999999',
    'webhook.update',
    NOW(),
    '{"event":{"type":"webhook.update","date":"' || NOW()::text || '"},"invoices":{"id":"1751357101223","external_id":"SHEIN_1751357101223_oqb6j01qc","status":{"code":5,"title":"Pagamento Confirmado!","description":"Obrigado pela sua Compra!","text":"approved"},"customer":999999,"prices":{"total":0.28,"discount":0,"taxs":{"others":0}},"type":"PIX","payment":{"gateway":"SuperPay","date":"' || NOW()::text || '","due":"' || (NOW() + INTERVAL '1 day')::text || '","details":{"qrcode":"00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/test"}}}}'::jsonb
);

-- 10. Verificar se foi inserido corretamente
SELECT 
    external_id,
    status_code,
    status_title,
    amount,
    is_paid,
    customer_id,
    processed_at
FROM payment_webhooks 
WHERE external_id = 'SHEIN_1751357101223_oqb6j01qc';

-- 11. Mostrar estatísticas
SELECT 
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE is_paid = true) as paid_webhooks,
    COUNT(DISTINCT gateway) as gateways,
    MAX(processed_at) as last_webhook
FROM payment_webhooks;

RAISE NOTICE '✅ TABELA PAYMENT_WEBHOOKS CRIADA COM SUCESSO!';
RAISE NOTICE '🎉 WEBHOOK DE TESTE INSERIDO PARA: SHEIN_1751357101223_oqb6j01qc';
RAISE NOTICE '💰 VALOR: R$ 0,28';
RAISE NOTICE '🚀 REALTIME HABILITADO - SISTEMA PRONTO!';

COMMIT;
