-- Criar tabela para armazenar webhooks de pagamento
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  invoice_id VARCHAR(255),
  token VARCHAR(255),
  status_code INTEGER,
  status_name VARCHAR(100),
  status_description TEXT,
  amount DECIMAL(10,2),
  payment_date TIMESTAMP,
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  webhook_data JSONB,
  received_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_received_at ON payment_webhooks(received_at);

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Armazena todos os webhooks recebidos do TryploPay';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID único do pagamento no sistema';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';
