-- Criar tabela para armazenar pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_payments (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(255) UNIQUE NOT NULL,
    external_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    amount DECIMAL(10,2),
    event_type VARCHAR(100),
    webhook_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_invoice_id ON superpaybr_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_external_id ON superpaybr_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_status ON superpaybr_payments(status);
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_created_at ON superpaybr_payments(created_at);

-- Criar tabela para broadcast de atualizações em tempo real
CREATE TABLE IF NOT EXISTS payment_updates (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(255) NOT NULL,
    external_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    amount DECIMAL(10,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para payment_updates
CREATE INDEX IF NOT EXISTS idx_payment_updates_invoice_id ON payment_updates(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_updates_timestamp ON payment_updates(timestamp);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela superpaybr_payments
DROP TRIGGER IF EXISTS update_superpaybr_payments_updated_at ON superpaybr_payments;
CREATE TRIGGER update_superpaybr_payments_updated_at
    BEFORE UPDATE ON superpaybr_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE superpaybr_payments IS 'Armazena todos os pagamentos e webhooks do SuperPayBR';
COMMENT ON TABLE payment_updates IS 'Tabela para broadcast de atualizações de pagamento em tempo real';

-- Inserir dados de exemplo para teste
INSERT INTO superpaybr_payments (invoice_id, external_id, status, amount, event_type, webhook_data, processed_at)
VALUES 
    ('TEST_001', 'SHEIN_TEST_001', 'pending', 34.90, 'invoice.created', '{"test": true}', NOW()),
    ('TEST_002', 'SHEIN_TEST_002', 'paid', 10.00, 'payment.approved', '{"test": true}', NOW())
ON CONFLICT (invoice_id) DO NOTHING;

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

-- Contar registros nas tabelas
SELECT 
    'superpaybr_payments' as table_name,
    COUNT(*) as record_count
FROM superpaybr_payments
UNION ALL
SELECT 
    'payment_updates' as table_name,
    COUNT(*) as record_count
FROM payment_updates;
