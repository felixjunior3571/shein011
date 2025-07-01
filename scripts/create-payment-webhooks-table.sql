-- Criar tabela para armazenar webhooks de pagamento
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,
  invoice_id TEXT,
  token TEXT,
  status_code INTEGER NOT NULL,
  status_name TEXT,
  status_title TEXT,
  status_description TEXT,
  status_text TEXT,
  amount DECIMAL(10,2) DEFAULT 0,
  payment_date TIMESTAMP,
  payment_due TIMESTAMP,
  payment_gateway TEXT,
  qr_code TEXT,
  webhook_data JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Status flags para consulta rápida
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  
  -- Gateway identifier
  gateway TEXT DEFAULT 'superpaybr',
  
  -- Constraint única para evitar duplicatas
  CONSTRAINT unique_external_id_gateway UNIQUE (external_id, gateway)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);

-- Trigger para updated_at automático
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
COMMENT ON TABLE payment_webhooks IS 'Armazena webhooks de pagamento da SuperPay';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo da fatura (ex: SHEIN_1751326765944_1qyme2zvx)';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código SuperPay: 5=pago, 12=negado, 15=vencido, 6=cancelado, 9=estornado';
COMMENT ON COLUMN payment_webhooks.is_paid IS 'TRUE quando status_code = 5 (pagamento confirmado)';
