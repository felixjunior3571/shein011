-- Criar tabela para webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_webhooks (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    invoice_id VARCHAR(255),
    status_code INTEGER NOT NULL DEFAULT 1,
    status_name VARCHAR(100) NOT NULL DEFAULT 'pending',
    status_title VARCHAR(255) NOT NULL DEFAULT 'Aguardando Pagamento',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_date TIMESTAMP NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_denied BOOLEAN NOT NULL DEFAULT FALSE,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    webhook_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_external_id ON superpaybr_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_invoice_id ON superpaybr_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_status_code ON superpaybr_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_is_paid ON superpaybr_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_created_at ON superpaybr_webhooks(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_superpaybr_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_superpaybr_webhooks_updated_at
    BEFORE UPDATE ON superpaybr_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_superpaybr_webhooks_updated_at();

-- Inserir dados de teste
INSERT INTO superpaybr_webhooks (
    external_id,
    invoice_id,
    status_code,
    status_name,
    status_title,
    amount,
    is_paid,
    webhook_data
) VALUES (
    'SHEIN_TEST_123456',
    'INV_TEST_123456',
    5,
    'paid',
    'Pagamento Confirmado',
    34.90,
    TRUE,
    '{"test": true, "provider": "superpaybr"}'::jsonb
) ON CONFLICT (external_id) DO NOTHING;

-- Comentários
COMMENT ON TABLE superpaybr_webhooks IS 'Tabela para armazenar webhooks do SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.external_id IS 'ID externo único da transação';
COMMENT ON COLUMN superpaybr_webhooks.status_code IS 'Código de status SuperPayBR (1=pending, 5=paid, etc)';
COMMENT ON COLUMN superpaybr_webhooks.webhook_data IS 'Dados completos do webhook em JSON';
