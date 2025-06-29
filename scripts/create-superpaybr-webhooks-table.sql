-- Criar tabela para armazenar webhooks SuperPayBR
CREATE TABLE IF NOT EXISTS superpaybr_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  status_code INTEGER DEFAULT 1,
  status_text VARCHAR(50) DEFAULT 'pending',
  status_title VARCHAR(255) DEFAULT 'Aguardando Pagamento',
  amount INTEGER DEFAULT 0,
  payment_date TIMESTAMP,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_superpaybr_external_id ON superpaybr_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_superpaybr_status_code ON superpaybr_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_superpaybr_paid ON superpaybr_webhooks(payment_date IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_superpaybr_created ON superpaybr_webhooks(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_superpaybr_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_superpaybr_updated_at
  BEFORE UPDATE ON superpaybr_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_superpaybr_webhooks_updated_at();

-- Inserir dados de teste (opcional)
INSERT INTO superpaybr_webhooks (external_id, status_code, status_text, status_title, amount, raw_data) 
VALUES 
    ('TEST_PAID_001', 2, 'paid', 'Pagamento Confirmado', 3490, '{"test": true, "status": "paid"}'),
    ('TEST_PENDING_001', 1, 'pending', 'Aguardando Pagamento', 3490, '{"test": true, "status": "pending"}'),
    ('TEST_DENIED_001', 3, 'denied', 'Pagamento Negado', 3490, '{"test": true, "status": "denied"}')
ON CONFLICT (external_id) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'superpaybr_webhooks'
ORDER BY ordinal_position;

-- Verificar dados inseridos
SELECT * FROM superpaybr_webhooks WHERE external_id LIKE 'TEST_%';

-- Comentários
COMMENT ON TABLE superpaybr_webhooks IS 'Armazena webhooks recebidos da SuperPayBR';
COMMENT ON COLUMN superpaybr_webhooks.external_id IS 'ID externo único da transação';
COMMENT ON COLUMN superpaybr_webhooks.status_code IS 'Código de status da transação';
COMMENT ON COLUMN superpaybr_webhooks.status_text IS 'Texto de status da transação';
COMMENT ON COLUMN superpaybr_webhooks.status_title IS 'Título de status da transação';
COMMENT ON COLUMN superpaybr_webhooks.amount IS 'Valor da transação';
COMMENT ON COLUMN superpaybr_webhooks.payment_date IS 'Data de pagamento';
COMMENT ON COLUMN superpaybr_webhooks.raw_data IS 'Dados brutos do webhook recebido';
