-- Tabela para armazenar webhooks de pagamento recebidos
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  invoice_id VARCHAR(255),
  status_code INTEGER NOT NULL,
  status_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMP,
  webhook_received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_webhook JSONB NOT NULL,
  processed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_webhooks_received_at ON payment_webhooks(webhook_received_at);

-- Comentários
COMMENT ON TABLE payment_webhooks IS 'Tabela para armazenar todos os webhooks de pagamento recebidos';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID único da transação';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código de status da SuperPayBR (5=pago, 12=negado, etc)';
COMMENT ON COLUMN payment_webhooks.raw_webhook IS 'Payload completo do webhook recebido';
COMMENT ON COLUMN payment_webhooks.processed IS 'Indica se o webhook foi processado com sucesso';
