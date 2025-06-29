-- Criar tabela de pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(100) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  is_denied BOOLEAN NOT NULL DEFAULT FALSE,
  is_expired BOOLEAN NOT NULL DEFAULT FALSE,
  is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
  is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
  payment_date TIMESTAMP NULL,
  webhook_data JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_is_paid ON payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Comentários
COMMENT ON TABLE payments IS 'Tabela de pagamentos SuperPayBR com dados de webhook';
COMMENT ON COLUMN payments.external_id IS 'ID único do pagamento (chave de integração)';
COMMENT ON COLUMN payments.webhook_data IS 'Dados completos recebidos do webhook SuperPayBR';

-- Inserir dados de teste (opcional)
INSERT INTO payments (external_id, status, amount, is_paid) 
VALUES ('TEST_SUPERPAYBR_001', 'Pagamento Confirmado!', 34.90, TRUE)
ON CONFLICT (external_id) DO NOTHING;

SELECT 'Tabela payments criada com sucesso!' as result;
