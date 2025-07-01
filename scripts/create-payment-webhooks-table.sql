-- Criar tabela payment_webhooks se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    token TEXT,
    status_code INTEGER NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);

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

-- Verificar se a tabela foi criada
SELECT 'Tabela payment_webhooks criada com sucesso!' as status;
