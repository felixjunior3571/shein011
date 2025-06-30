-- Criar tabela payment_webhooks se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    status_code INTEGER NOT NULL DEFAULT 1,
    status_name TEXT NOT NULL DEFAULT 'pending',
    status_title TEXT NOT NULL DEFAULT 'Aguardando Pagamento',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date TIMESTAMPTZ,
    webhook_data JSONB,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_denied BOOLEAN NOT NULL DEFAULT FALSE,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    gateway TEXT NOT NULL DEFAULT 'superpaybr',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_external_id UNIQUE (external_id),
    CONSTRAINT valid_amount CHECK (amount >= 0),
    CONSTRAINT valid_status_code CHECK (status_code > 0)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at ON payment_webhooks(created_at);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo para teste (opcional)
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    status_code,
    status_name,
    status_title,
    amount,
    is_paid,
    gateway
) VALUES (
    'TEST_WEBHOOK_001',
    'INV_TEST_001',
    1,
    'pending',
    'Aguardando Pagamento',
    27.97,
    FALSE,
    'superpaybr'
) ON CONFLICT (external_id) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks'
ORDER BY ordinal_position;

-- Mostrar estatísticas da tabela
SELECT 
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE is_paid = TRUE) as paid_count,
    COUNT(*) FILTER (WHERE is_denied = TRUE) as denied_count,
    COUNT(*) FILTER (WHERE is_expired = TRUE) as expired_count,
    COUNT(*) FILTER (WHERE is_canceled = TRUE) as canceled_count,
    COUNT(*) FILTER (WHERE is_refunded = TRUE) as refunded_count
FROM payment_webhooks;
