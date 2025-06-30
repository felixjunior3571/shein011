-- Criar tabela para armazenar webhooks SuperPay com tokens seguros
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  invoice_id VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  status_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE,
  webhook_data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
  token VARCHAR(255), -- Token seguro para verificação
  expires_at TIMESTAMP WITH TIME ZONE, -- Expiração do token (15 minutos)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar consultas SuperPay
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_expires_at ON payment_webhooks(expires_at);

-- Índice composto para consultas por gateway e external_id
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_external_id ON payment_webhooks(gateway, external_id);

-- Índice composto para consultas por gateway e token
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_token ON payment_webhooks(gateway, token);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Armazena webhooks de pagamento do SuperPay com tokens seguros';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID externo do pagamento (gerado pela aplicação)';
COMMENT ON COLUMN payment_webhooks.invoice_id IS 'ID da fatura no SuperPay';
COMMENT ON COLUMN payment_webhooks.status_code IS 'Código de status do SuperPay (5=Pago, 12=Negado, etc.)';
COMMENT ON COLUMN payment_webhooks.token IS 'Token seguro para verificação (expira em 15 minutos)';
COMMENT ON COLUMN payment_webhooks.expires_at IS 'Data/hora de expiração do token';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';
COMMENT ON COLUMN payment_webhooks.gateway IS 'Gateway de pagamento (superpay, tryplopay, etc.)';

-- Inserir dados de exemplo para testes (opcional)
INSERT INTO payment_webhooks (
  external_id,
  invoice_id,
  status_code,
  status_name,
  amount,
  payment_date,
  webhook_data,
  is_paid,
  gateway,
  token,
  expires_at
) VALUES (
  'SUPERPAY_TEST_001',
  'TEST_INVOICE_001',
  5,
  'Pagamento Confirmado!',
  99.90,
  NOW(),
  '{"event":{"type":"webhook.update","date":"2025-06-30 12:00:00"},"invoices":{"id":"TEST_INVOICE_001","external_id":"SUPERPAY_TEST_001","status":{"code":5,"title":"Pagamento Confirmado!"}}}',
  true,
  'superpay',
  'SPY_TEST_TOKEN_001',
  NOW() + INTERVAL '15 minutes'
) ON CONFLICT DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks' 
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'payment_webhooks';

COMMIT;
