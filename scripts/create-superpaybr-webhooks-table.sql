-- Criar tabela para armazenar webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_webhooks (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255),
    status_code INTEGER NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_data JSONB NOT NULL,
    webhook_payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_external_id ON superpaybr_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_invoice_id ON superpaybr_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_status_code ON superpaybr_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_created_at ON superpaybr_webhooks(created_at);

-- Comentários para documentação
COMMENT ON TABLE superpaybr_webhooks IS 'Armazena webhooks recebidos da SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.external_id IS 'ID externo único da fatura (SHEIN_timestamp_random)';
COMMENT ON COLUMN superpaybr_webhooks.invoice_id IS 'ID da fatura na SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.status_code IS 'Código de status da SuperPayBR (1=Aguardando, 5=Pago, etc)';
COMMENT ON COLUMN superpaybr_webhooks.status_name IS 'Nome do status em português';
COMMENT ON COLUMN superpaybr_webhooks.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN superpaybr_webhooks.payment_data IS 'Dados processados do pagamento (formato padronizado)';
COMMENT ON COLUMN superpaybr_webhooks.webhook_payload IS 'Payload completo recebido da SuperPayBR';
