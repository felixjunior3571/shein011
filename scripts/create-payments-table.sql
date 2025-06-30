-- Criar tabela de pagamentos para SuperPay Integration
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pix_code TEXT,
  qr_code_base64 TEXT,
  superpay_invoice_id VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_token ON payments(token);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments(expires_at);

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
COMMENT ON TABLE payments IS 'Tabela de pagamentos PIX via SuperPay';
COMMENT ON COLUMN payments.external_id IS 'ID único gerado (FRETE_timestamp_random)';
COMMENT ON COLUMN payments.token IS 'Token seguro para verificação (15min expiração)';
COMMENT ON COLUMN payments.status IS 'Status: pendente, pago, recusado, cancelado, estornado, vencido';
COMMENT ON COLUMN payments.expires_at IS 'Data/hora de expiração do token';
COMMENT ON COLUMN payments.paid_at IS 'Data/hora da confirmação do pagamento';
