-- Criar tabela para webhooks SuperPayBR se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255),
    provider VARCHAR(50) NOT NULL DEFAULT 'superpaybr',
    status_code INTEGER,
    status_name VARCHAR(100),
    status_title VARCHAR(255),
    amount DECIMAL(10,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    payment_date TIMESTAMP,
    webhook_data JSONB,
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices para performance
    UNIQUE(external_id, provider)
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(is_paid, is_denied, is_expired);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar webhooks de pagamento da SuperPayBR';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único do pagamento';
COMMENT ON COLUMN payment_webhooks.provider IS 'Provedor de pagamento (superpaybr)';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código de status SuperPayBR (5=Pago, 6=Negado, 7=Vencido)';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em JSON';
