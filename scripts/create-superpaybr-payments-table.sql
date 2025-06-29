-- Criar tabela para armazenar pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_payments (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    invoice_id VARCHAR(255),
    status_code INTEGER,
    status_name VARCHAR(255),
    amount DECIMAL(10,2),
    payment_date TIMESTAMP,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    raw_webhook_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_invoice_id ON superpaybr_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status ON superpaybr_payments(is_paid, is_denied, is_expired);
CREATE INDEX IF NOT EXISTS idx_superpaybr_created_at ON superpaybr_payments(created_at);

-- Criar tabela para updates de pagamento (broadcast)
CREATE TABLE IF NOT EXISTS payment_updates (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    payment_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índice para payment_updates
CREATE INDEX IF NOT EXISTS idx_payment_updates_external_id ON payment_updates(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_updates_created_at ON payment_updates(created_at);

-- Comentários para documentação
COMMENT ON TABLE superpaybr_payments IS 'Armazena todos os pagamentos e webhooks do SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.external_id IS 'ID externo único do pagamento';
COMMENT ON COLUMN superpaybr_payments.invoice_id IS 'ID da fatura associada ao pagamento';
COMMENT ON COLUMN superpaybr_payments.status_code IS 'Código numérico do status SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.status_name IS 'Nome do status do pagamento';
COMMENT ON COLUMN superpaybr_payments.amount IS 'Valor do pagamento';
COMMENT ON COLUMN superpaybr_payments.payment_date IS 'Data do pagamento';
COMMENT ON COLUMN superpaybr_payments.customer_name IS 'Nome do cliente';
COMMENT ON COLUMN superpaybr_payments.customer_email IS 'Email do cliente';
COMMENT ON COLUMN superpaybr_payments.is_paid IS 'Indica se o pagamento foi realizado';
COMMENT ON COLUMN superpaybr_payments.is_denied IS 'Indica se o pagamento foi negado';
COMMENT ON COLUMN superpaybr_payments.is_expired IS 'Indica se o pagamento expirou';
COMMENT ON COLUMN superpaybr_payments.is_canceled IS 'Indica se o pagamento foi cancelado';
COMMENT ON COLUMN superpaybr_payments.is_refunded IS 'Indica se o pagamento foi reembolsado';
COMMENT ON COLUMN superpaybr_payments.raw_webhook_data IS 'Dados brutos recebidos via webhook';
COMMENT ON TABLE payment_updates IS 'Armazena updates de pagamento para broadcast aos clientes';
COMMENT ON COLUMN payment_updates.external_id IS 'ID externo único do pagamento';
COMMENT ON COLUMN payment_updates.payment_data IS 'Dados completos do update de pagamento';
COMMENT ON COLUMN payment_updates.created_at IS 'Data de criação do update de pagamento';

-- Inserir dados de teste (opcional)
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
    'TEST_SUPERPAYBR_001',
    'INV_TEST_001',
    5,
    'Pagamento Confirmado',
    34.90,
    NOW(),
    'Cliente Teste',
    'teste@superpaybr.com',
    TRUE,
    '{"test": true, "source": "sql_script"}'
) ON CONFLICT DO NOTHING;

-- Verificar se as tabelas foram criadas
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('superpaybr_payments', 'payment_updates')
ORDER BY table_name, ordinal_position;
