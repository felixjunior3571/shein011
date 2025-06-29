-- Criar tabela de pagamentos SuperPayBR
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  invoice_id TEXT,
  token TEXT,
  amount DECIMAL(10,2),
  status_code INTEGER,
  status_text TEXT,
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_code ON payments(status_code);
CREATE INDEX IF NOT EXISTS idx_payments_is_paid ON payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE payments IS 'Tabela para armazenar status de pagamentos SuperPayBR via webhook';
COMMENT ON COLUMN payments.external_id IS 'ID único gerado pela aplicação (SHEIN_*)';
COMMENT ON COLUMN payments.status_code IS 'Código de status SuperPayBR (5=pago, 12=negado, etc)';
COMMENT ON COLUMN payments.is_paid IS 'TRUE quando status_code = 5';
