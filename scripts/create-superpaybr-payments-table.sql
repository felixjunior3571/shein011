-- Criar tabela para armazenar pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_payments (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(255) UNIQUE NOT NULL,
    external_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    amount DECIMAL(10,2) DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'pix',
    webhook_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_invoice_id ON superpaybr_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_external_id ON superpaybr_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_status ON superpaybr_payments(status);
CREATE INDEX IF NOT EXISTS idx_superpaybr_payments_created_at ON superpaybr_payments(created_at);

-- Criar tabela para broadcast de atualizações
CREATE TABLE IF NOT EXISTS payment_updates (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0.00,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para payment_updates
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

-- Inserir dados de exemplo para testes
INSERT INTO superpaybr_payments (invoice_id, external_id, status, amount, payment_method, webhook_data)
VALUES 
    ('TEST_001', 'SHEIN_TEST_001', 'pending', 34.90, 'pix', '{"test": true}'),
    ('TEST_002', 'SHEIN_TEST_002', 'paid', 10.00, 'pix', '{"test": true, "paid_at": "2024-01-01T10:00:00Z"}')
ON CONFLICT (invoice_id) DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE superpaybr_payments IS 'Tabela para armazenar todos os pagamentos SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.invoice_id IS 'ID único da fatura na SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.external_id IS 'ID externo gerado pela aplicação';
COMMENT ON COLUMN superpaybr_payments.status IS 'Status do pagamento (pending, paid, cancelled, expired)';
COMMENT ON COLUMN superpaybr_payments.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN superpaybr_payments.payment_method IS 'Método de pagamento (pix, boleto, cartao)';
COMMENT ON COLUMN superpaybr_payments.webhook_data IS 'Dados completos recebidos via webhook';

COMMENT ON TABLE payment_updates IS 'Tabela para broadcast de atualizações de pagamento em tempo real';
COMMENT ON COLUMN payment_updates.invoice_id IS 'ID da fatura relacionada';
COMMENT ON COLUMN payment_updates.status IS 'Novo status do pagamento';
COMMENT ON COLUMN payment_updates.amount IS 'Valor do pagamento';
COMMENT ON COLUMN payment_updates.timestamp IS 'Timestamp da atualização';
