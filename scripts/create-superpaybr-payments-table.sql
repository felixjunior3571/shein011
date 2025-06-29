-- Criar tabela para armazenar pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_payments (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    payment_id VARCHAR(255),
    status_code INTEGER DEFAULT 1,
    status_name VARCHAR(100) DEFAULT 'pending',
    amount DECIMAL(10,2) DEFAULT 0.00,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    webhook_data JSONB,
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_payment_id ON superpaybr_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status_code ON superpaybr_payments(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_is_paid ON superpaybr_payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_superpaybr_created_at ON superpaybr_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_superpaybr_updated_at ON superpaybr_payments(updated_at);

-- Criar tabela para broadcast de atualizações em tempo real
CREATE TABLE IF NOT EXISTS payment_updates (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    status_code INTEGER,
    status_name VARCHAR(100),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    amount DECIMAL(10,2),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para payment_updates
CREATE INDEX IF NOT EXISTS idx_payment_updates_external_id ON payment_updates(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_updates_created_at ON payment_updates(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela superpaybr_payments
DROP TRIGGER IF EXISTS update_superpaybr_payments_updated_at ON superpaybr_payments;
CREATE TRIGGER update_superpaybr_payments_updated_at
    BEFORE UPDATE ON superpaybr_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE superpaybr_payments IS 'Armazena todos os pagamentos processados via SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.external_id IS 'ID único gerado pela aplicação para identificar o pagamento';
COMMENT ON COLUMN superpaybr_payments.payment_id IS 'ID do pagamento retornado pela SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.status_code IS 'Código de status SuperPayBR (1=pendente, 5=pago, 3=negado, etc)';
COMMENT ON COLUMN superpaybr_payments.webhook_data IS 'Dados completos recebidos via webhook SuperPayBR';

COMMENT ON TABLE payment_updates IS 'Tabela para broadcast de atualizações de pagamento em tempo real';

-- Inserir dados de exemplo para testes
INSERT INTO superpaybr_payments (
    external_id, 
    payment_id, 
    status_code, 
    status_name, 
    amount, 
    is_paid, 
    webhook_data
) VALUES (
    'EXAMPLE_SHEIN_001',
    'SPB_EXAMPLE_001',
    5,
    'Pagamento Confirmado',
    34.90,
    TRUE,
    '{"example": true, "test_data": "SuperPayBR integration test"}'
) ON CONFLICT (external_id) DO NOTHING;

-- Verificar se as tabelas foram criadas
SELECT 
    table_name,
    table_type,
    table_comment
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('superpaybr_payments', 'payment_updates');

-- Verificar índices criados
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('superpaybr_payments', 'payment_updates')
ORDER BY tablename, indexname;
