-- Tabela para armazenar faturas criadas
CREATE TABLE IF NOT EXISTS faturas (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  invoice_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_cpf VARCHAR(11),
  payment_method VARCHAR(50) DEFAULT 'pix',
  qr_code_url TEXT,
  pix_code TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  paid_at TIMESTAMP,
  raw_data JSONB
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_faturas_external_id ON faturas(external_id);
CREATE INDEX IF NOT EXISTS idx_faturas_invoice_id ON faturas(invoice_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_created_at ON faturas(created_at);

-- Comentários
COMMENT ON TABLE faturas IS 'Tabela para armazenar faturas PIX criadas via SuperPayBR';
COMMENT ON COLUMN faturas.external_id IS 'ID único gerado pela aplicação';
COMMENT ON COLUMN faturas.invoice_id IS 'ID da fatura retornado pela SuperPayBR';
COMMENT ON COLUMN faturas.raw_data IS 'Dados completos retornados pela API SuperPayBR';
