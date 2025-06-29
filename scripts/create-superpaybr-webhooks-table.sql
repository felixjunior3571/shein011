-- Criar tabela para armazenar webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  invoice_id VARCHAR(255),
  provider VARCHAR(50) NOT NULL DEFAULT 'superpaybr',
  status_code INTEGER,
  status_title VARCHAR(255),
  status_name VARCHAR(100),
  amount DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMP,
  webhook_data JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(external_id, provider)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);

-- Trigger para atualizar updated_at
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

-- Inserir dados de exemplo (opcional)
INSERT INTO payment_webhooks (
  external_id, 
  invoice_id, 
  provider, 
  status_code, 
  status_title, 
  status_name, 
  amount, 
  is_paid, 
  webhook_data
) VALUES (
  'EXAMPLE_SUPERPAYBR_001',
  'INV_EXAMPLE_001',
  'superpaybr',
  1,
  'Aguardando Pagamento',
  'pending',
  34.90,
  FALSE,
  '{"event": {"type": "invoice.update"}, "invoices": {"id": "INV_EXAMPLE_001", "status": {"code": 1, "title": "Aguardando Pagamento"}}}'::jsonb
) ON CONFLICT (external_id, provider) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks' 
ORDER BY ordinal_position;
