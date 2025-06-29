-- Criar tabela de pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2),
  provider VARCHAR(50) NOT NULL DEFAULT 'superpaybr',
  webhook_data JSONB,
  api_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_updated_at ON payments(updated_at);

-- Comentários para documentação
COMMENT ON TABLE payments IS 'Tabela para armazenar dados de pagamentos do SuperPayBR';
COMMENT ON COLUMN payments.payment_id IS 'ID único do pagamento (external_id)';
COMMENT ON COLUMN payments.status IS 'Status do pagamento (pending, paid, failed, etc.)';
COMMENT ON COLUMN payments.amount IS 'Valor do pagamento em reais';
COMMENT ON COLUMN payments.provider IS 'Provedor de pagamento (superpaybr)';
COMMENT ON COLUMN payments.webhook_data IS 'Dados recebidos via webhook';
COMMENT ON COLUMN payments.api_data IS 'Dados consultados via API';
