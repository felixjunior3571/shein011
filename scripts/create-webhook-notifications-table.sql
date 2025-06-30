-- Tabela para notificações temporárias de webhook (otimizada para múltiplos usuários)
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  payment_confirmed BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  redirect_url TEXT,
  redirect_type VARCHAR(50) DEFAULT 'checkout',
  amount DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMP,
  gateway VARCHAR(50) DEFAULT 'superpaybr',
  pay_id VARCHAR(255),
  webhook_received_at TIMESTAMP DEFAULT NOW(),
  last_update TIMESTAMP DEFAULT NOW(),
  webhook_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance com múltiplos usuários
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_external_id ON webhook_notifications(external_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_status ON webhook_notifications(status);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_payment_confirmed ON webhook_notifications(payment_confirmed);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_created_at ON webhook_notifications(created_at);

-- Criar índice composto para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_external_status ON webhook_notifications(external_id, status, payment_confirmed);

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

-- Adicionar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhook_notifications_updated_at 
    BEFORE UPDATE ON webhook_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE webhook_notifications IS 'Notificações temporárias de webhook para múltiplos usuários simultâneos';
COMMENT ON COLUMN webhook_notifications.external_id IS 'ID único da fatura/transação';
COMMENT ON COLUMN webhook_notifications.expires_at IS 'Data/hora de expiração da notificação (15 minutos)';
COMMENT ON COLUMN webhook_notifications.redirect_type IS 'Tipo de redirecionamento: checkout ou activation';
COMMENT ON FUNCTION cleanup_expired_webhook_notifications() IS 'Remove notificações expiradas automaticamente';

-- Inserir dados de exemplo para teste (opcional)
INSERT INTO webhook_notifications (external_id, status, amount, gateway) 
VALUES ('TEST_001', 'pending', 34.90, 'superpaybr')
ON CONFLICT DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'webhook_notifications' 
ORDER BY ordinal_position;
