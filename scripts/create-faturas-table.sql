-- Tabela para armazenar faturas e tokens
CREATE TABLE IF NOT EXISTS faturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' NOT NULL,
  invoice_id VARCHAR(255),
  qr_code TEXT,
  pix_code TEXT,
  amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_faturas_token ON faturas(token);
CREATE INDEX IF NOT EXISTS idx_faturas_external_id ON faturas(external_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
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

-- Função para limpar tokens expirados (opcional)
CREATE OR REPLACE FUNCTION cleanup_expired_faturas()
RETURNS void AS $$
BEGIN
    DELETE FROM faturas 
    WHERE expires_at < NOW() 
    AND status = 'pendente';
END;
$$ language 'plpgsql';
