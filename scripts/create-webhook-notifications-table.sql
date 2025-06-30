-- Criar tabela para notificações de webhook
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  redirect_url VARCHAR(255),
  redirect_type VARCHAR(50) DEFAULT 'checkout',
  payment_confirmed BOOLEAN DEFAULT FALSE,
  amount DECIMAL(10,2),
  paid_at TIMESTAMP WITH TIME ZONE,
  gateway VARCHAR(100),
  pay_id VARCHAR(255),
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_external_id ON webhook_notifications(external_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_status ON webhook_notifications(status);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_expires_at ON webhook_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_webhook_received_at ON webhook_notifications(webhook_received_at);

-- Comentários para documentação
COMMENT ON TABLE webhook_notifications IS 'Notificações de webhook para redirecionamento de pagamentos';
COMMENT ON COLUMN webhook_notifications.external_id IS 'ID externo único da fatura';
COMMENT ON COLUMN webhook_notifications.status IS 'Status do pagamento (pago, recusado, cancelado, etc)';
COMMENT ON COLUMN webhook_notifications.redirect_url IS 'URL para redirecionamento após pagamento';
COMMENT ON COLUMN webhook_notifications.redirect_type IS 'Tipo de redirecionamento (checkout, activation)';
COMMENT ON COLUMN webhook_notifications.payment_confirmed IS 'Se o pagamento foi confirmado';
COMMENT ON COLUMN webhook_notifications.expires_at IS 'Data de expiração da notificação';

-- Função para limpeza automática de notificações expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_webhook_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_notifications 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_webhook_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_notifications_updated_at
  BEFORE UPDATE ON webhook_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_notifications_updated_at();
