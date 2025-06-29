-- Criar tabela para armazenar pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_payments (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    invoice_id VARCHAR(255),
    status_code INTEGER DEFAULT 0,
    status_name VARCHAR(255) DEFAULT 'Aguardando Pagamento',
    amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    webhook_data JSONB,
    payment_date TIMESTAMP,
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_invoice_id ON superpaybr_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status ON superpaybr_payments(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_paid ON superpaybr_payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_superpaybr_created ON superpaybr_payments(created_at);

-- Criar tabela para broadcast de atualizações
CREATE TABLE IF NOT EXISTS payment_updates (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    update_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para atualizações
CREATE INDEX IF NOT EXISTS idx_payment_updates_external_id ON payment_updates(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_updates_created ON payment_updates(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_superpaybr_payments_updated_at 
    BEFORE UPDATE ON superpaybr_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE superpaybr_payments IS 'Armazena todos os pagamentos processados via SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.external_id IS 'ID externo único do pagamento';
COMMENT ON COLUMN superpaybr_payments.invoice_id IS 'ID da fatura na SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.status_code IS 'Código do status do pagamento';
COMMENT ON COLUMN superpaybr_payments.status_name IS 'Nome do status do pagamento';
COMMENT ON COLUMN superpaybr_payments.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN superpaybr_payments.is_paid IS 'Indica se o pagamento foi realizado';
COMMENT ON COLUMN superpaybr_payments.is_denied IS 'Indica se o pagamento foi negado';
COMMENT ON COLUMN superpaybr_payments.is_refunded IS 'Indica se o pagamento foi reembolsado';
COMMENT ON COLUMN superpaybr_payments.is_expired IS 'Indica se o pagamento expirou';
COMMENT ON COLUMN superpaybr_payments.is_canceled IS 'Indica se o pagamento foi cancelado';
COMMENT ON COLUMN superpaybr_payments.webhook_data IS 'Dados completos recebidos via webhook';
COMMENT ON COLUMN superpaybr_payments.payment_date IS 'Data do pagamento';
COMMENT ON COLUMN superpaybr_payments.processed_at IS 'Data de processamento do pagamento';
COMMENT ON COLUMN superpaybr_payments.created_at IS 'Data de criação do pagamento';
COMMENT ON COLUMN superpaybr_payments.updated_at IS 'Data de atualização do pagamento';

COMMENT ON TABLE payment_updates IS 'Armazena atualizações de pagamento para broadcast em tempo real';
COMMENT ON COLUMN payment_updates.external_id IS 'ID externo do pagamento atualizado';
COMMENT ON COLUMN payment_updates.update_data IS 'Dados da atualização';
COMMENT ON COLUMN payment_updates.created_at IS 'Data de criação da atualização';

-- Inserir dados de exemplo (opcional)
INSERT INTO superpaybr_payments (
    external_id, 
    invoice_id, 
    status_code, 
    status_name, 
    amount, 
    is_paid
) VALUES (
    'EXAMPLE_001', 
    'INV_EXAMPLE_001', 
    1, 
    'Aguardando Pagamento', 
    34.90, 
    FALSE
) ON CONFLICT (external_id) DO NOTHING;

-- Verificar se as tabelas foram criadas
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('superpaybr_payments', 'payment_updates');

-- Verificar índices criados
SELECT 
    indexname, 
    tablename 
FROM pg_indexes 
WHERE tablename IN ('superpaybr_payments', 'payment_updates');
