-- Criar tabela para armazenar pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_payments (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    status_code INTEGER,
    amount DECIMAL(10,2),
    payment_date TIMESTAMP,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    webhook_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status ON superpaybr_payments(status);
CREATE INDEX IF NOT EXISTS idx_superpaybr_is_paid ON superpaybr_payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_superpaybr_created_at ON superpaybr_payments(created_at);

-- Comentários para documentação
COMMENT ON TABLE superpaybr_payments IS 'Tabela para armazenar status de pagamentos SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.external_id IS 'ID externo único do pagamento';
COMMENT ON COLUMN superpaybr_payments.status IS 'Status do pagamento (paid, denied, pending, etc.)';
COMMENT ON COLUMN superpaybr_payments.status_code IS 'Código numérico do status SuperPayBR';
COMMENT ON COLUMN superpaybr_payments.webhook_data IS 'Dados completos recebidos via webhook';
