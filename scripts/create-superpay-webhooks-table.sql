-- Criar tabela para armazenar webhooks da SuperPay
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    token TEXT,
    status_code INTEGER NOT NULL,
    status_title TEXT NOT NULL,
    status_description TEXT,
    status_text TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date TIMESTAMPTZ,
    payment_due TIMESTAMPTZ,
    payment_gateway TEXT,
    qr_code TEXT,
    webhook_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    gateway TEXT NOT NULL DEFAULT 'superpaybr',
    UNIQUE(external_id, gateway)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_webhooks_updated_at 
    BEFORE UPDATE ON payment_webhooks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Armazena webhooks recebidos da SuperPay para monitoramento de pagamentos';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo único da fatura gerado pelo sistema';
COMMENT ON COLUMN payment_webhooks.invoice_id IS 'ID da fatura na SuperPay';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código numérico do status (5=pago, 12=negado, etc)';
COMMENT ON COLUMN payment_webhooks.gateway IS 'Gateway usado (superpaybr, superpay, etc)';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados brutos do webhook em JSON';

-- Verificar se a tabela foi criada com sucesso
SELECT 
    'payment_webhooks' as table_name,
    COUNT(*) as record_count,
    NOW() as created_at
FROM payment_webhooks;
