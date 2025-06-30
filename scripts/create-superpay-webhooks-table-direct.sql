-- Script direto para criar tabela payment_webhooks no Supabase
-- Execute este script diretamente no SQL Editor do Supabase

-- Criar tabela payment_webhooks se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMPTZ,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
    token VARCHAR(255),
    expires_at TIMESTAMPTZ,
    webhook_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_status ON payment_webhooks(gateway, status_code);

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

-- Inserir dados de teste SuperPay
INSERT INTO payment_webhooks (
    external_id, 
    invoice_id, 
    status_code, 
    status_name, 
    amount, 
    payment_date, 
    processed_at,
    is_paid, 
    is_denied, 
    is_expired, 
    is_canceled, 
    is_refunded, 
    is_critical,
    gateway,
    token,
    expires_at,
    webhook_data
) VALUES 
-- Status 1: Aguardando Pagamento (não crítico)
('TEST_SUPERPAY_001', 'INV_001', 1, 'Aguardando Pagamento', 34.90, NULL, NOW(),
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 
 'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_test001', NOW() + INTERVAL '15 minutes',
 '{"external_id": "TEST_SUPERPAY_001", "status": 1, "amount": 34.90}'::jsonb),

-- Status 2: Em Processamento (não crítico)
('TEST_SUPERPAY_002', 'INV_002', 2, 'Em Processamento', 49.90, NULL, NOW(),
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay',
 'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_test002', NOW() + INTERVAL '15 minutes',
 '{"external_id": "TEST_SUPERPAY_002", "status": 2, "amount": 49.90}'::jsonb),

-- Status 5: Pago (CRÍTICO)
('TEST_SUPERPAY_005', 'INV_005', 5, 'Pago', 29.90, NOW(), NOW(),
 TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, 'superpay',
 'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_test005', NOW() + INTERVAL '15 minutes',
 '{"external_id": "TEST_SUPERPAY_005", "status": 5, "amount": 29.90}'::jsonb),

-- Status 12: Negado (CRÍTICO)
('TEST_SUPERPAY_012', 'INV_012', 12, 'Negado', 44.90, NULL, NOW(),
 FALSE, TRUE, FALSE, FALSE, FALSE, TRUE, 'superpay',
 'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_test012', NOW() + INTERVAL '15 minutes',
 '{"external_id": "TEST_SUPERPAY_012", "status": 12, "amount": 44.90}'::jsonb),

-- Status 15: Vencido (CRÍTICO)
('TEST_SUPERPAY_015', 'INV_015', 15, 'Vencido', 24.90, NULL, NOW(),
 FALSE, FALSE, TRUE, FALSE, FALSE, TRUE, 'superpay',
 'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_test015', NOW() + INTERVAL '15 minutes',
 '{"external_id": "TEST_SUPERPAY_015", "status": 15, "amount": 24.90}'::jsonb),

-- Token expirado para teste
('TEST_SUPERPAY_EXPIRED', 'INV_EXPIRED', 1, 'Aguardando Pagamento', 19.90, NULL, NOW() - INTERVAL '1 hour',
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay',
 'SPY_EXPIRED_TOKEN_123', NOW() - INTERVAL '45 minutes',
 '{"external_id": "TEST_SUPERPAY_EXPIRED", "status": 1, "amount": 19.90}'::jsonb)

ON CONFLICT (external_id) DO NOTHING;

-- Verificar se os dados foram inseridos
SELECT 
    'payment_webhooks' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE gateway = 'superpay') as registros_superpay,
    COUNT(*) FILTER (WHERE is_paid = TRUE) as pagamentos_confirmados,
    COUNT(*) FILTER (WHERE is_critical = TRUE) as status_criticos,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as tokens_expirados
FROM payment_webhooks;

-- Mostrar alguns registros de exemplo
SELECT 
    external_id,
    status_name,
    amount,
    is_paid,
    is_critical,
    CASE 
        WHEN expires_at < NOW() THEN 'EXPIRADO'
        ELSE 'VÁLIDO'
    END as token_status
FROM payment_webhooks 
WHERE gateway = 'superpay'
ORDER BY processed_at DESC
LIMIT 10;
