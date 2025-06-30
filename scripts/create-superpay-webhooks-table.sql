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

-- Função para limpeza automática de tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM payment_webhooks 
    WHERE expires_at < NOW() - INTERVAL '24 hours'
    AND gateway = 'superpay'
    AND NOT is_critical;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Limpeza automática: % tokens expirados removidos', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar webhooks de pagamento do SuperPay com rate limiting e tokens seguros';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único do pagamento (ex: SHEIN_1234567890_abc123)';
COMMENT ON COLUMN payment_webhooks.token IS 'Token único de segurança com expiração de 15 minutos';
COMMENT ON COLUMN payment_webhooks.expires_at IS 'Data/hora de expiração do token (15 minutos após criação)';
COMMENT ON COLUMN payment_webhooks.is_critical IS 'Indica se o status é crítico (pago, negado, cancelado, etc.)';
COMMENT ON COLUMN payment_webhooks.gateway IS 'Gateway de pagamento (superpay)';

-- Verificar se a tabela foi criada com sucesso
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_webhooks') THEN
        RAISE NOTICE '✅ Tabela payment_webhooks criada com sucesso!';
        RAISE NOTICE '📊 Índices criados: % índices', (
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'payment_webhooks'
        );
    ELSE
        RAISE EXCEPTION '❌ Erro: Tabela payment_webhooks não foi criada!';
    END IF;
END $$;
