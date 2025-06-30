-- Tabela para notificações temporárias de webhook (otimizada para múltiplos usuários)
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  redirect_url VARCHAR(500),
  redirect_type VARCHAR(50) DEFAULT 'checkout',
  payment_confirmed BOOLEAN DEFAULT FALSE,
  amount DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMP,
  gateway VARCHAR(100),
  pay_id VARCHAR(255),
  webhook_received_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance com múltiplos usuários
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_external_id ON webhook_notifications(external_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_expires_at ON webhook_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_payment_confirmed ON webhook_notifications(payment_confirmed);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_status ON webhook_notifications(status);

-- Função para limpeza automática de notificações expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_webhook_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_notifications 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE webhook_notifications IS 'Notificações temporárias de webhook para múltiplos usuários simultâneos';
COMMENT ON COLUMN webhook_notifications.external_id IS 'ID único da fatura/transação';
COMMENT ON COLUMN webhook_notifications.expires_at IS 'Data/hora de expiração da notificação (15 minutos)';
COMMENT ON COLUMN webhook_notifications.redirect_type IS 'Tipo de redirecionamento: checkout ou activation';
COMMENT ON FUNCTION cleanup_expired_webhook_notifications() IS 'Remove notificações expiradas automaticamente';
