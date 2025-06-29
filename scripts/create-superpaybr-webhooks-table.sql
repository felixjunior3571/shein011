-- Criar tabela para armazenar webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 1,
  status_name VARCHAR(255) NOT NULL DEFAULT 'Aguardando Pagamento',
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  is_denied BOOLEAN NOT NULL DEFAULT FALSE,
  is_expired BOOLEAN NOT NULL DEFAULT FALSE,
  is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
  is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_date TIMESTAMP NULL,
  webhook_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_external_id ON superpaybr_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_status_code ON superpaybr_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_is_paid ON superpaybr_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_superpaybr_webhooks_created_at ON superpaybr_webhooks(created_at);

-- Comentários para documentação
COMMENT ON TABLE superpaybr_webhooks IS 'Armazena dados de webhooks recebidos da SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.external_id IS 'ID externo único da fatura (SHEIN_timestamp_random)';
COMMENT ON COLUMN superpaybr_webhooks.status_code IS 'Código de status SuperPayBR (1=Aguardando, 5=Pago, etc.)';
COMMENT ON COLUMN superpaybr_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';

-- Inserir dados de exemplo para teste (opcional)
INSERT INTO superpaybr_webhooks (
  external_id, 
  status_code, 
  status_name, 
  is_paid, 
  amount, 
  webhook_data
) VALUES (
  'SHEIN_TEST_123456',
  1,
  'Aguardando Pagamento',
  FALSE,
  34.90,
  '{"test": true, "message": "Dados de exemplo para teste"}'
) ON CONFLICT (external_id) DO NOTHING;

-- Mostrar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'superpaybr_webhooks'
ORDER BY ordinal_position;
