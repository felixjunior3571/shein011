-- Criar tabela para armazenar webhooks de pagamento
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255) NOT NULL,
    token VARCHAR(255),
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    status_description VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date TIMESTAMPTZ,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_denied BOOLEAN NOT NULL DEFAULT FALSE,
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
    webhook_data JSONB,
    gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_received_at ON payment_webhooks(received_at DESC);

-- Constraint única para evitar duplicatas
ALTER TABLE payment_webhooks 
ADD CONSTRAINT unique_external_id_gateway 
UNIQUE (external_id, gateway);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_webhooks_updated_at 
    BEFORE UPDATE ON payment_webhooks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Armazena webhooks de pagamento recebidos dos gateways (SuperPay, TryploPay, etc.)';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único da transação';
COMMENT ON COLUMN payment_webhooks.invoice_id IS 'ID da fatura no gateway';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código de status do pagamento (1-16)';
COMMENT ON COLUMN payment_webhooks.is_paid IS 'Status crítico: pagamento confirmado (status_code = 5)';
COMMENT ON COLUMN payment_webhooks.is_denied IS 'Status crítico: pagamento negado (status_code = 12)';
COMMENT ON COLUMN payment_webhooks.is_expired IS 'Status crítico: pagamento vencido (status_code = 15)';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Payload completo do webhook em JSON';
COMMENT ON COLUMN payment_webhooks.gateway IS 'Gateway de pagamento (superpay, tryplopay, etc.)';
