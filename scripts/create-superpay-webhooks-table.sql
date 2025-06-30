-- Criar tabela para webhooks SuperPay se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMP WITH TIME ZONE,
    webhook_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
    token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para otimizar consultas SuperPay
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_expires_at ON payment_webhooks(expires_at);

-- Criar índice composto para consultas por gateway e external_id
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_external_id ON payment_webhooks(gateway, external_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela
DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo para testes SuperPay
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    status_code,
    status_name,
    amount,
    payment_date,
    webhook_data,
    is_paid,
    gateway,
    token,
    expires_at
) VALUES 
(
    'SHEIN_EXAMPLE_001',
    'SPY_INV_001',
    5,
    'Pago',
    34.90,
    NOW(),
    '{"event":{"type":"webhook.update","date":"2025-01-01 12:00:00"},"invoices":{"id":"SPY_INV_001","external_id":"SHEIN_EXAMPLE_001","status":{"code":5,"title":"Pago"},"prices":{"total":34.90}}}',
    true,
    'superpay',
    'SPY_1735689600000_abc123',
    NOW() + INTERVAL '15 minutes'
),
(
    'SHEIN_EXAMPLE_002',
    'SPY_INV_002',
    1,
    'Aguardando Pagamento',
    29.90,
    NULL,
    '{"event":{"type":"webhook.update","date":"2025-01-01 12:00:00"},"invoices":{"id":"SPY_INV_002","external_id":"SHEIN_EXAMPLE_002","status":{"code":1,"title":"Aguardando Pagamento"},"prices":{"total":29.90}}}',
    false,
    'superpay',
    'SPY_1735689600001_def456',
    NOW() + INTERVAL '15 minutes'
),
(
    'SHEIN_EXAMPLE_003',
    'SPY_INV_003',
    12,
    'Negado',
    39.90,
    NULL,
    '{"event":{"type":"webhook.update","date":"2025-01-01 12:00:00"},"invoices":{"id":"SPY_INV_003","external_id":"SHEIN_EXAMPLE_003","status":{"code":12,"title":"Negado"},"prices":{"total":39.90}}}',
    false,
    'superpay',
    'SPY_1735689600002_ghi789',
    NOW() + INTERVAL '15 minutes'
) ON CONFLICT (external_id, gateway) DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar webhooks de pagamento do SuperPay e outros gateways';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único da transação';
COMMENT ON COLUMN payment_webhooks.invoice_id IS 'ID da fatura no gateway';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código numérico do status (SuperPay: 1=Aguardando, 5=Pago, 12=Negado, etc.)';
COMMENT ON COLUMN payment_webhooks.token IS 'Token único para verificação segura (expira em 15 minutos)';
COMMENT ON COLUMN payment_webhooks.expires_at IS 'Data/hora de expiração do token de verificação';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Payload completo do webhook em formato JSON';

-- Verificar se a tabela foi criada com sucesso
SELECT 
    'payment_webhooks' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN gateway = 'superpay' THEN 1 END) as superpay_records,
    COUNT(CASE WHEN is_paid = true THEN 1 END) as paid_records
FROM payment_webhooks;

-- Mostrar estrutura da tabela
\d payment_webhooks;
