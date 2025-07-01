-- =====================================================
-- SCRIPT PARA CORRIGIR A TABELA PAYMENT_WEBHOOKS
-- Adiciona a coluna customer_id que estava faltando
-- =====================================================

BEGIN;

-- 1. Primeiro, vamos verificar se a tabela existe
DO $$ 
BEGIN
    -- Se a tabela não existir, criar ela completa
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_webhooks') THEN
        CREATE TABLE payment_webhooks (
            id BIGSERIAL PRIMARY KEY,
            external_id TEXT NOT NULL,
            invoice_id TEXT,
            token TEXT,
            gateway TEXT NOT NULL DEFAULT 'superpay',
            status_code INTEGER NOT NULL DEFAULT 1,
            status_name TEXT,
            status_title TEXT,
            status_description TEXT,
            status_text TEXT,
            amount DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            taxes DECIMAL(10,2) DEFAULT 0,
            payment_type TEXT DEFAULT 'PIX',
            payment_gateway TEXT,
            payment_date TIMESTAMPTZ,
            payment_due TIMESTAMPTZ,
            qr_code TEXT,
            pix_code TEXT,
            barcode TEXT,
            payment_url TEXT,
            is_paid BOOLEAN DEFAULT FALSE,
            is_denied BOOLEAN DEFAULT FALSE,
            is_expired BOOLEAN DEFAULT FALSE,
            is_canceled BOOLEAN DEFAULT FALSE,
            is_refunded BOOLEAN DEFAULT FALSE,
            customer_id TEXT,
            event_type TEXT DEFAULT 'webhook.update',
            event_date TIMESTAMPTZ,
            webhook_data JSONB,
            processed_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela payment_webhooks criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela payment_webhooks já existe, verificando colunas...';
    END IF;
END $$;

-- 2. Adicionar a coluna customer_id se ela não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_webhooks' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE payment_webhooks ADD COLUMN customer_id TEXT;
        RAISE NOTICE 'Coluna customer_id adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna customer_id já existe!';
    END IF;
END $$;

-- 3. Adicionar outras colunas que podem estar faltando
DO $$ 
BEGIN
    -- Verificar e adicionar invoice_id
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_webhooks' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE payment_webhooks ADD COLUMN invoice_id TEXT;
        RAISE NOTICE 'Coluna invoice_id adicionada!';
    END IF;

    -- Verificar e adicionar token
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_webhooks' 
        AND column_name = 'token'
    ) THEN
        ALTER TABLE payment_webhooks ADD COLUMN token TEXT;
        RAISE NOTICE 'Coluna token adicionada!';
    END IF;

    -- Verificar e adicionar status_text
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_webhooks' 
        AND column_name = 'status_text'
    ) THEN
        ALTER TABLE payment_webhooks ADD COLUMN status_text TEXT;
        RAISE NOTICE 'Coluna status_text adicionada!';
    END IF;

    -- Verificar e adicionar payment_due
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_webhooks' 
        AND column_name = 'payment_due'
    ) THEN
        ALTER TABLE payment_webhooks ADD COLUMN payment_due TIMESTAMPTZ;
        RAISE NOTICE 'Coluna payment_due adicionada!';
    END IF;

    -- Verificar e adicionar event_type
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_webhooks' 
        AND column_name = 'event_type'
    ) THEN
        ALTER TABLE payment_webhooks ADD COLUMN event_type TEXT DEFAULT 'webhook.update';
        RAISE NOTICE 'Coluna event_type adicionada!';
    END IF;

    -- Verificar e adicionar event_date
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_webhooks' 
        AND column_name = 'event_date'
    ) THEN
        ALTER TABLE payment_webhooks ADD COLUMN event_date TIMESTAMPTZ;
        RAISE NOTICE 'Coluna event_date adicionada!';
    END IF;
END $$;

-- 4. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_gateway ON payment_webhooks(external_id, gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_customer_id ON payment_webhooks(customer_id);

-- 5. Criar constraint única se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'payment_webhooks' 
        AND constraint_name = 'unique_external_gateway'
    ) THEN
        ALTER TABLE payment_webhooks 
        ADD CONSTRAINT unique_external_gateway 
        UNIQUE (external_id, gateway);
        RAISE NOTICE 'Constraint unique_external_gateway criada!';
    ELSE
        RAISE NOTICE 'Constraint unique_external_gateway já existe!';
    END IF;
END $$;

-- 6. Habilitar Row Level Security
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- 7. Criar política RLS se não existir
DROP POLICY IF EXISTS "Enable all operations for payment_webhooks" ON payment_webhooks;
CREATE POLICY "Enable all operations for payment_webhooks" ON payment_webhooks
FOR ALL USING (true) WITH CHECK (true);

-- 8. Habilitar Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;
    RAISE NOTICE 'Realtime habilitado para payment_webhooks!';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Realtime já estava habilitado para payment_webhooks!';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao habilitar Realtime: %', SQLERRM;
END $$;

-- 9. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Inserir o webhook que falhou (seu pagamento)
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
    status_description = EXCLUDED.status_description,
    status_text = EXCLUDED.status_text,
    amount = EXCLUDED.amount,
    payment_date = EXCLUDED.payment_date,
    payment_due = EXCLUDED.payment_due,
    qr_code = EXCLUDED.qr_code,
    is_paid = EXCLUDED.is_paid,
    customer_id = EXCLUDED.customer_id,
    event_type = EXCLUDED.event_type,
    event_date = EXCLUDED.event_date,
    webhook_data = EXCLUDED.webhook_data,
    updated_at = NOW();

-- 12. Verificar se tudo funcionou
DO $$
DECLARE
    webhook_count INTEGER;
    paid_webhook_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO webhook_count FROM payment_webhooks;
    SELECT COUNT(*) INTO paid_webhook_count FROM payment_webhooks WHERE is_paid = true;
    
    RAISE NOTICE '=== RESULTADO DA EXECUÇÃO ===';
    RAISE NOTICE 'Total de webhooks: %', webhook_count;
    RAISE NOTICE 'Webhooks pagos: %', paid_webhook_count;
    
    IF EXISTS (
        SELECT 1 FROM payment_webhooks 
        WHERE external_id = 'SHEIN_1751355096377_ylb68yqqt' 
        AND is_paid = true
    ) THEN
        RAISE NOTICE '✅ SEU PAGAMENTO FOI ENCONTRADO E ESTÁ CONFIRMADO!';
        RAISE NOTICE '💳 Valor: R$ 27,97';
        RAISE NOTICE '🎯 External ID: SHEIN_1751355096377_ylb68yqqt';
        RAISE NOTICE '🚀 Você pode prosseguir para ativação do cartão!';
    ELSE
        RAISE NOTICE '❌ Webhook do pagamento não foi encontrado';
    END IF;
END $$;

-- 13. Mostrar estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks' 
ORDER BY ordinal_position;

-- 14. Mostrar o webhook inserido
SELECT 
    external_id,
    status_code,
    status_title,
    amount,
    is_paid,
    customer_id,
    processed_at
FROM payment_webhooks 
WHERE external_id = 'SHEIN_1751355096377_ylb68yqqt'
ORDER BY processed_at DESC;

COMMIT;
