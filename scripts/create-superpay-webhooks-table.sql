-- Criar tabela para webhooks SuperPay se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255),
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
    token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    webhook_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_expires_at ON payment_webhooks(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_critical ON payment_webhooks(is_critical);

-- Criar índice composto para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_external_id ON payment_webhooks(gateway, external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_token ON payment_webhooks(gateway, token);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para limpeza automática de tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM payment_webhooks 
    WHERE gateway = 'superpay' 
    AND expires_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar webhooks de pagamento do SuperPay com rate limiting';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único do pagamento';
COMMENT ON COLUMN payment_webhooks.token IS 'Token de segurança com expiração de 15 minutos';
COMMENT ON COLUMN payment_webhooks.expires_at IS 'Data de expiração do token de segurança';
COMMENT ON COLUMN payment_webhooks.is_critical IS 'Indica se o status é crítico (pago, negado, etc.)';
COMMENT ON COLUMN payment_webhooks.gateway IS 'Gateway de pagamento (superpay)';

-- Inserir dados de exemplo para teste
INSERT INTO payment_webhooks (
    external_id, 
    invoice_id, 
    status_code, 
    status_name, 
    amount, 
    is_paid, 
    is_critical, 
    gateway, 
    token, 
    expires_at,
    webhook_data
) VALUES 
(
    'TEST_SUPERPAY_001', 
    'INV_TEST_001', 
    5, 
    'Pago', 
    34.90, 
    TRUE, 
    TRUE, 
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 34.90, "status": "paid"}'::jsonb
),
(
    'TEST_SUPERPAY_002', 
    'INV_TEST_002', 
    12, 
    'Negado', 
    49.90, 
    FALSE, 
    TRUE, 
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 49.90, "status": "denied"}'::jsonb
),
(
    'TEST_SUPERPAY_003', 
    'INV_TEST_003', 
    1, 
    'Aguardando Pagamento', 
    29.90, 
    FALSE, 
    FALSE, 
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 29.90, "status": "pending"}'::jsonb
)
ON CONFLICT (external_id) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    'payment_webhooks' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE gateway = 'superpay') as superpay_records,
    COUNT(*) FILTER (WHERE is_paid = TRUE) as paid_records,
    COUNT(*) FILTER (WHERE is_critical = TRUE) as critical_records
FROM payment_webhooks;

-- Mostrar estrutura da tabela
\d payment_webhooks;
