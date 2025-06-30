-- Criar tabela para armazenar webhooks recebidos
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  invoice_id VARCHAR(255),
  webhook_data JSONB NOT NULL,
  status_code INTEGER,
  status_name VARCHAR(100),
  amount DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT false,
  is_denied BOOLEAN DEFAULT false,
  is_expired BOOLEAN DEFAULT false,
  is_canceled BOOLEAN DEFAULT false,
  is_refunded BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_webhooks_received_at ON payment_webhooks(received_at);

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar webhooks de pagamento recebidos da SuperPayBR';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID único da fatura no sistema';
COMMENT ON COLUMN payment_webhooks.invoice_id IS 'ID da fatura na SuperPayBR';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código de status do pagamento';
COMMENT ON COLUMN payment_webhooks.status_name IS 'Nome/descrição do status do pagamento';
COMMENT ON COLUMN payment_webhooks.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN payment_webhooks.is_paid IS 'Indica se o pagamento foi confirmado';
COMMENT ON COLUMN payment_webhooks.is_denied IS 'Indica se o pagamento foi negado';
COMMENT ON COLUMN payment_webhooks.is_expired IS 'Indica se o pagamento expirou';
COMMENT ON COLUMN payment_webhooks.is_canceled IS 'Indica se o pagamento foi cancelado';
COMMENT ON COLUMN payment_webhooks.is_refunded IS 'Indica se o pagamento foi estornado';
