-- Criar tabela para armazenar webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  webhook_data JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  amount DECIMAL(10,2) DEFAULT 0,
  simulated BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMP NULL,
  raw_webhook JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status ON superpaybr_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_superpaybr_paid ON superpaybr_webhooks(payment_date IS NOT NULL);
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

-- Inserir dados de teste (opcional)
INSERT INTO superpaybr_webhooks (external_id, webhook_data, status, amount, simulated) 
VALUES (
    'TEST_SUPERPAYBR_001',
    '{"test": true, "message": "Webhook de teste SuperPayBR"}',
    'test',
    34.90,
    true
) ON CONFLICT DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'superpaybr_webhooks'
ORDER BY ordinal_position;

-- Comentários
COMMENT ON TABLE superpaybr_webhooks IS 'Armazena webhooks recebidos da SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.external_id IS 'ID externo único da transação';
COMMENT ON COLUMN superpaybr_webhooks.webhook_data IS 'Dados completos do webhook recebido';
COMMENT ON COLUMN superpaybr_webhooks.status IS 'Status da transação';
COMMENT ON COLUMN superpaybr_webhooks.amount IS 'Valor da transação';
COMMENT ON COLUMN superpaybr_webhooks.simulated IS 'Indica se a transação foi simulada';
