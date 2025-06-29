-- Criar tabela de pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(100) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_denied BOOLEAN NOT NULL DEFAULT false,
  is_expired BOOLEAN NOT NULL DEFAULT false,
  is_canceled BOOLEAN NOT NULL DEFAULT false,
  is_refunded BOOLEAN NOT NULL DEFAULT false,
  payment_date TIMESTAMP NULL,
  webhook_data JSONB NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'superpaybr',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_is_paid ON payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Comentários para documentação
COMMENT ON TABLE payments IS 'Tabela de pagamentos SuperPayBR com dados de webhook';
COMMENT ON COLUMN payments.external_id IS 'ID único do pagamento (SHEIN_timestamp_random)';
COMMENT ON COLUMN payments.status IS 'Status do pagamento (pending, paid, denied, etc)';
COMMENT ON COLUMN payments.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN payments.webhook_data IS 'Dados completos recebidos do webhook SuperPayBR';
COMMENT ON COLUMN payments.provider IS 'Provedor de pagamento (superpaybr)';
