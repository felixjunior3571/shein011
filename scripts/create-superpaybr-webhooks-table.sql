-- Criar tabela para armazenar webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  status_code INTEGER NOT NULL,
  status_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMP NULL,
  raw_webhook JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status ON superpaybr_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_paid ON superpaybr_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_superpaybr_created ON superpaybr_webhooks(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_superpaybr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_superpaybr_updated_at
  BEFORE UPDATE ON superpaybr_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_superpaybr_updated_at();

-- Comentários
COMMENT ON TABLE superpaybr_webhooks IS 'Armazena webhooks recebidos da SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.external_id IS 'ID externo único da transação';
COMMENT ON COLUMN superpaybr_webhooks.status_code IS 'Código de status SuperPayBR (1=Aguardando, 5=Pago, etc)';
COMMENT ON COLUMN superpaybr_webhooks.raw_webhook IS 'Dados completos do webhook recebido';
