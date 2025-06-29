-- Criar tabela para armazenar pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_payments (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    invoice_id VARCHAR(255),
    status_code INTEGER DEFAULT 0,
    status_name VARCHAR(255) DEFAULT 'pending',
    amount DECIMAL(10,2) DEFAULT 0.00,
    payment_date TIMESTAMP,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    raw_webhook_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_invoice_id ON superpaybr_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status ON superpaybr_payments(is_paid, is_denied, is_expired);
CREATE INDEX IF NOT EXISTS idx_superpaybr_created_at ON superpaybr_payments(created_at);

-- Criar tabela para atualizações de pagamento em tempo real
CREATE TABLE IF NOT EXISTS payment_updates (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    payment_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para payment_updates
CREATE INDEX IF NOT EXISTS idx_payment_updates_external_id ON payment_updates(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_updates_created_at ON payment_updates(created_at);

-- Criar função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_superpaybr_payments_updated_at ON superpaybr_payments;
CREATE TRIGGER update_superpaybr_payments_updated_at
    BEFORE UPDATE ON superpaybr_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo para teste (opcional)
INSERT INTO superpaybr_payments (
    external_id,
    invoice_id,
    status_code,
    status_name,
    amount,
    payment_date,
    customer_name,
    customer_email,
    is_paid,
    raw_webhook_data
) VALUES (
    'TEST_EXAMPLE_001',
    'INV_TEST_001',
    5,
    'Pagamento Confirmado!',
    34.90,
    CURRENT_TIMESTAMP,
    'Cliente Teste',
    'teste@exemplo.com',
    TRUE,
    '{"test": true, "external_id": "TEST_EXAMPLE_001", "status": "paid"}'::jsonb
) ON CONFLICT (external_id) DO NOTHING;

-- Verificar se as tabelas foram criadas corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('superpaybr_payments', 'payment_updates')
ORDER BY table_name, ordinal_position;

-- Mostrar estatísticas das tabelas
SELECT 
    'superpaybr_payments' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END) as paid_count,
    COUNT(CASE WHEN is_denied = TRUE THEN 1 END) as denied_count,
    COUNT(CASE WHEN is_expired = TRUE THEN 1 END) as expired_count
FROM superpaybr_payments

UNION ALL

SELECT 
    'payment_updates' as table_name,
    COUNT(*) as total_records,
    0 as paid_count,
    0 as denied_count,
    0 as expired_count
FROM payment_updates;

-- Comentários das tabelas
COMMENT ON TABLE superpaybr_payments IS 'Tabela para armazenar todos os pagamentos processados via SuperPayBR';
COMMENT ON TABLE payment_updates IS 'Tabela para broadcast de atualizações de pagamento em tempo real';

COMMENT ON COLUMN superpaybr_payments.external_id IS 'ID único do pagamento gerado pela aplicação';
COMMENT ON COLUMN superpaybr_payments.invoice_id IS 'ID da fatura retornado pela API SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.status_code IS 'Código numérico do status (5=pago, 3=negado, etc)';
COMMENT ON COLUMN superpaybr_payments.status_name IS 'Nome descritivo do status do pagamento';
COMMENT ON COLUMN superpaybr_payments.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN superpaybr_payments.raw_webhook_data IS 'Dados brutos recebidos do webhook SuperPayBR';

-- Concluir script
SELECT 'Tabelas SuperPayBR criadas com sucesso!' as resultado;
