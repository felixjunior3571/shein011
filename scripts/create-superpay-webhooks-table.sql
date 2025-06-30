-- Criar tabela para webhooks SuperPay se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date TIMESTAMP NULL,
    webhook_data JSONB NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_denied BOOLEAN NOT NULL DEFAULT FALSE,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
    token VARCHAR(255) NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_expires_at ON payment_webhooks(expires_at);

-- Criar índice composto para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_external_id ON payment_webhooks(gateway, external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_status ON payment_webhooks(gateway, is_paid, is_denied, is_expired, is_canceled);

-- Adicionar comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar webhooks de pagamento do SuperPay e outros gateways';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único da transação';
COMMENT ON COLUMN payment_webhooks.invoice_id IS 'ID da fatura no gateway';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código de status do pagamento (SuperPay: 5=Pago, 12=Negado, etc.)';
COMMENT ON COLUMN payment_webhooks.token IS 'Token único para verificação segura (expira em 15 minutos)';
COMMENT ON COLUMN payment_webhooks.expires_at IS 'Data/hora de expiração do token de verificação';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';
COMMENT ON COLUMN payment_webhooks.gateway IS 'Gateway de pagamento (superpay, tryplopay, etc.)';

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
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
    amount, 
    webhook_data, 
    gateway,
    token,
    expires_at
) VALUES (
    'TEST_SUPERPAY_001',
    'INV_TEST_001', 
    1, 
    'Aguardando Pagamento', 
    34.90, 
    '{"test": true, "message": "Registro de teste SuperPay"}',
    'superpay',
    'SPY_TEST_TOKEN_001',
    NOW() + INTERVAL '15 minutes'
) ON CONFLICT DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks' 
ORDER BY ordinal_position;

-- Mostrar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'payment_webhooks';

-- Contar registros na tabela
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_paid = true THEN 1 END) as paid_records,
    COUNT(CASE WHEN gateway = 'superpay' THEN 1 END) as superpay_records
FROM payment_webhooks;

COMMIT;
