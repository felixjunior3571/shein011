-- Primeiro, vamos dropar a tabela existente e recriar corretamente
DROP TABLE IF EXISTS payment_webhooks CASCADE;

-- Criar ou atualizar a tabela payment_webhooks com todas as colunas necessárias
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,
  invoice_id TEXT,
  token TEXT,
  gateway TEXT NOT NULL DEFAULT 'superpay',
  
  -- Status
  status_code INTEGER,
  status_name TEXT,
  status_title TEXT,
  status_description TEXT,
  status_text TEXT,
  
  -- Valores
  amount DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  taxes DECIMAL(10,2) DEFAULT 0,
  
  -- Pagamento
  payment_type TEXT,
  payment_gateway TEXT,
  payment_date TIMESTAMPTZ,
  payment_due TIMESTAMPTZ,
  
  -- Códigos
  qr_code TEXT,
  pix_code TEXT,
  barcode TEXT,
  payment_url TEXT,
  
  -- Flags de status
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  
  -- Cliente
  customer_id INTEGER,
  
  -- Evento
  event_type TEXT,
  event_date TIMESTAMPTZ,
  
  -- Metadata
  webhook_data JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(external_id, gateway)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_updated_at ON payment_webhooks(updated_at);

-- Habilitar Realtime
ALTER TABLE payment_webhooks REPLICA IDENTITY FULL;

-- Adicionar à publicação do Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'payment_webhooks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;
  END IF;
END $$;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
  BEFORE UPDATE ON payment_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de teste se não existirem
INSERT INTO payment_webhooks (
  external_id,
  invoice_id,
  gateway,
  status_code,
  status_name,
  status_title,
  amount,
  payment_gateway,
  is_paid,
  webhook_data,
  processed_at,
  updated_at
) VALUES (
  'SHEIN_1751350461481_922teqg5i',
  '1751350770',
  'superpay',
  5,
  'paid',
  'Pagamento Confirmado!',
  27.97,
  'SuperPay',
  true,
  '{"test": true}',
  NOW(),
  NOW()
) ON CONFLICT (external_id, gateway) DO UPDATE SET
  status_code = EXCLUDED.status_code,
  status_name = EXCLUDED.status_name,
  status_title = EXCLUDED.status_title,
  amount = EXCLUDED.amount,
  is_paid = EXCLUDED.is_paid,
  updated_at = NOW();

-- Verificar se tudo foi criado corretamente
SELECT 
  'Tabela criada com sucesso!' as message,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_paid = true) as paid_records
FROM payment_webhooks;
