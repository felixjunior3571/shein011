-- Criar tabela faturas no Supabase
CREATE TABLE IF NOT EXISTS faturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  qr_code TEXT,
  qr_code_base64 TEXT,
  pix_copy_paste TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  redirect_url VARCHAR(255) DEFAULT '/obrigado',
  webhook_data JSONB,
  superpay_invoice_id VARCHAR(255)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_faturas_external_id ON faturas(external_id);
CREATE INDEX IF NOT EXISTS idx_faturas_token ON faturas(token);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_created_at ON faturas(created_at);
CREATE INDEX IF NOT EXISTS idx_faturas_expires_at ON faturas(expires_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faturas_updated_at 
    BEFORE UPDATE ON faturas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar faturas expiradas (executar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_faturas()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM faturas 
    WHERE expires_at < NOW() - INTERVAL '1 day'
    AND status IN ('pendente', 'cancelado', 'recusado', 'vencido');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE faturas IS 'Tabela para armazenar faturas PIX da SuperPayBR';
COMMENT ON COLUMN faturas.external_id IS 'ID único no formato FRETE_timestamp_random';
COMMENT ON COLUMN faturas.token IS 'Token seguro para verificação de status';
COMMENT ON COLUMN faturas.status IS 'Status: pendente, pago, cancelado, recusado, estornado, vencido';
COMMENT ON COLUMN faturas.expires_at IS 'Data de expiração do token (15 minutos)';
COMMENT ON COLUMN faturas.webhook_data IS 'Dados completos recebidos do webhook SuperPayBR';
