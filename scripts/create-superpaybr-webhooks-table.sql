-- Criar tabela para webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_webhooks (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255),
    token VARCHAR(255),
    status_code INTEGER NOT NULL DEFAULT 1,
    status_name VARCHAR(50) NOT NULL DEFAULT 'pending',
    status_title VARCHAR(255) NOT NULL DEFAULT 'Aguardando Pagamento',
    status_description TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMP,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    client_name VARCHAR(255),
    client_document VARCHAR(20),
    client_email VARCHAR(255),
    webhook_data JSONB,
    received_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_external_id ON superpaybr_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_invoice_id ON superpaybr_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_token ON superpaybr_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_status_code ON superpaybr_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_is_paid ON superpaybr_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_received_at ON superpaybr_webhooks(received_at);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_status ON superpaybr_webhooks(status_code, status_name);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_payment_status ON superpaybr_webhooks(is_paid, is_denied, is_expired);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_created_at ON superpaybr_webhooks(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_superpaybr_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_superpaybr_webhooks_updated_at
    BEFORE UPDATE ON superpaybr_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_superpaybr_webhooks_updated_at();

-- Inserir dados de teste
INSERT INTO superpaybr_webhooks (
    external_id,
    invoice_id,
    token,
    status_code,
    status_name,
    status_title,
    amount,
    payment_date,
    is_paid,
    client_name,
    client_email,
    webhook_data
) VALUES (
    'SHEIN_TEST_001',
    'INV_TEST_001',
    'TOKEN_TEST_001',
    5,
    'Pago',
    'Pagamento Confirmado',
    34.90,
    NOW(),
    TRUE,
    'Cliente Teste',
    'teste@exemplo.com',
    '{"event": {"type": "invoice.update"}, "invoices": {"status": {"code": 5, "title": "Pago"}}}'::jsonb
) ON CONFLICT (external_id) DO NOTHING;

INSERT INTO superpaybr_webhooks (
    external_id,
    invoice_id,
    status_code,
    status_name,
    status_title,
    amount,
    payment_date,
    is_paid,
    webhook_data
) VALUES (
    'SHEIN_TEST_123',
    'INV_TEST_123',
    2,
    'paid',
    'Pagamento Confirmado',
    34.90,
    NOW(),
    TRUE,
    '{"test": true, "source": "manual_insert"}'
) ON CONFLICT (external_id) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'superpaybr_webhooks'
ORDER BY ordinal_position;

-- Comentários
COMMENT ON TABLE superpaybr_webhooks IS 'Tabela para armazenar webhooks do SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.external_id IS 'ID externo único da fatura';
COMMENT ON COLUMN superpaybr_webhooks.status_code IS 'Código de status do SuperPayBR (1=Aguardando, 5=Pago, etc.)';
COMMENT ON COLUMN superpaybr_webhooks.webhook_data IS 'Dados completos do webhook em JSON';
