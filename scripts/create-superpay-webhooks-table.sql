-- Criar tabela para webhooks SuperPay se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMP NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
    token VARCHAR(255) NULL,
    expires_at TIMESTAMP NULL,
    webhook_data JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para performance
    CONSTRAINT unique_external_gateway UNIQUE (external_id, gateway)
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(is_paid, is_denied, is_expired, is_canceled);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar webhooks de pagamento do SuperPay e outros gateways';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único do pagamento';
COMMENT ON COLUMN payment_webhooks.token IS 'Token único com expiração de 15 minutos para verificação';
COMMENT ON COLUMN payment_webhooks.expires_at IS 'Data/hora de expiração do token';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';

-- Inserir dados de exemplo para teste
INSERT INTO payment_webhooks (
    external_id, 
    invoice_id, 
    status_code, 
    status_name, 
    amount, 
    gateway,
    token,
    expires_at,
    webhook_data
) VALUES (
    'EXAMPLE_SUPERPAY_001',
    'INV_EXAMPLE_001',
    1,
    'Aguardando Pagamento',
    34.90,
    'superpay',
    'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_example',
    NOW() + INTERVAL '15 minutes',
    '{"event": {"type": "invoice.created"}, "invoices": {"id": "INV_EXAMPLE_001", "external_id": "EXAMPLE_SUPERPAY_001"}}'::jsonb
) ON CONFLICT (external_id, gateway) DO NOTHING;

-- Mostrar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks' 
ORDER BY ordinal_position;
