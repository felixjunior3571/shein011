-- Criar tabela para armazenar webhooks de pagamento (versão híbrida)
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  invoice_id VARCHAR(255),
  status_code INTEGER,
  status_name VARCHAR(100),
  amount DECIMAL(10,2),
  payment_date TIMESTAMP,
  pay_id VARCHAR(255),
  webhook_data JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT false,
  is_denied BOOLEAN DEFAULT false,
  is_expired BOOLEAN DEFAULT false,
  is_canceled BOOLEAN DEFAULT false,
  is_refunded BOOLEAN DEFAULT false,
  gateway VARCHAR(50) DEFAULT 'superpay',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(is_paid, is_denied, is_expired, is_canceled, is_refunded);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);

-- Criar constraint única para evitar duplicatas
ALTER TABLE payment_webhooks 
ADD CONSTRAINT unique_external_id_gateway 
UNIQUE (external_id, gateway);

-- Tabela para notificações em tempo real (dados voláteis)
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  notification_data JSONB,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_external_id ON webhook_notifications(external_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_expires_at ON webhook_notifications(expires_at);

-- Auto-limpeza de notificações antigas
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_notifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger para limpeza automática
CREATE OR REPLACE FUNCTION trigger_cleanup_notifications()
RETURNS trigger AS $$
BEGIN
  PERFORM cleanup_old_notifications();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS auto_cleanup_notifications ON webhook_notifications;
CREATE TRIGGER auto_cleanup_notifications
  AFTER INSERT ON webhook_notifications
  EXECUTE FUNCTION trigger_cleanup_notifications();

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Armazena todos os webhooks recebidos dos gateways de pagamento';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID único do pagamento no sistema';
COMMENT ON COLUMN payment_webhooks.gateway IS 'Gateway de pagamento (superpay, tryplopay, etc)';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';
