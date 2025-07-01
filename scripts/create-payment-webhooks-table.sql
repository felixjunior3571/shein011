-- Criar tabela payment_webhooks se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    token TEXT,
    status_code INTEGER NOT NULL DEFAULT 1,
    status_name TEXT,
    status_title TEXT,
    status_description TEXT,
    status_text TEXT,
    amount DECIMAL(10,2),
    payment_date TIMESTAMPTZ,
    payment_due TIMESTAMPTZ,
    payment_gateway TEXT,
    qr_code TEXT,
    pix_code TEXT,
    barcode TEXT,
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    gateway TEXT NOT NULL DEFAULT 'superpaybr',
    
    -- Constraint para evitar duplicatas
    UNIQUE(external_id, gateway)
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar se a tabela foi criada com sucesso
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_webhooks') THEN
        RAISE NOTICE '✅ Tabela payment_webhooks criada com sucesso!';
        RAISE NOTICE '📊 Estrutura: % colunas', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'payment_webhooks');
        RAISE NOTICE '🔍 Índices: % índices criados', (SELECT count(*) FROM pg_indexes WHERE tablename = 'payment_webhooks');
    ELSE
        RAISE EXCEPTION '❌ Erro: Tabela payment_webhooks não foi criada!';
    END IF;
END $$;
