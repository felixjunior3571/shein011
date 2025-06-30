-- Criar tabela para armazenar webhooks SuperPay
-- Baseado na documentação oficial SuperPay

CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificadores únicos
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255) NOT NULL,
    token VARCHAR(255),
    
    -- Status do pagamento
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    
    -- Valores e datas
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Estados booleanos
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    
    -- Metadados
    gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
    webhook_data JSONB,
    
    -- Token de segurança com expiração
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_critical ON payment_webhooks(is_critical);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_expires_at ON payment_webhooks(expires_at);

-- Índice composto para consultas por gateway e external_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_external_id 
ON payment_webhooks(gateway, external_id);

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

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Armazena webhooks de pagamento do SuperPay com rate limiting e tokens de segurança';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único do pagamento no sistema cliente';
COMMENT ON COLUMN payment_webhooks.invoice_id IS 'ID da fatura no SuperPay';
COMMENT ON COLUMN payment_webhooks.token IS 'Token único de segurança com expiração de 15 minutos';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código de status SuperPay (1-15)';
COMMENT ON COLUMN payment_webhooks.is_critical IS 'Indica se o status é crítico e requer processamento imediato';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';
COMMENT ON COLUMN payment_webhooks.expires_at IS 'Data de expiração do token de segurança';

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
    webhook_data,
    token,
    expires_at
) VALUES (
    'SHEIN_TEST_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    'INV_TEST_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    1,
    'Aguardando Pagamento',
    34.90,
    FALSE,
    FALSE,
    'superpay',
    '{"test": true, "created_by": "sql_script"}',
    'SPY_TEST_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || substr(md5(random()::text), 1, 8),
    NOW() + INTERVAL '15 minutes'
) ON CONFLICT (gateway, external_id) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    'payment_webhooks' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END) as paid_records,
    COUNT(CASE WHEN is_critical = TRUE THEN 1 END) as critical_records,
    COUNT(CASE WHEN gateway = 'superpay' THEN 1 END) as superpay_records
FROM payment_webhooks;

-- Mostrar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks' 
ORDER BY ordinal_position;

-- Mostrar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'payment_webhooks'
ORDER BY indexname;

COMMIT;
