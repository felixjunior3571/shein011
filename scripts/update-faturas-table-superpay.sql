-- Adicionar colunas específicas para SuperPay na tabela faturas
ALTER TABLE faturas 
ADD COLUMN IF NOT EXISTS superpay_status_code INTEGER,
ADD COLUMN IF NOT EXISTS superpay_status_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS superpay_status_description TEXT,
ADD COLUMN IF NOT EXISTS gateway VARCHAR(50) DEFAULT 'pix',
ADD COLUMN IF NOT EXISTS pay_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS redirect_type VARCHAR(50) DEFAULT 'checkout',
ADD COLUMN IF NOT EXISTS callback_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_faturas_superpay_status_code ON faturas(superpay_status_code);
CREATE INDEX IF NOT EXISTS idx_faturas_gateway ON faturas(gateway);
CREATE INDEX IF NOT EXISTS idx_faturas_redirect_type ON faturas(redirect_type);
CREATE INDEX IF NOT EXISTS idx_faturas_pay_id ON faturas(pay_id);
CREATE INDEX IF NOT EXISTS idx_faturas_paid_at ON faturas(paid_at);

-- Comentários para documentação
COMMENT ON COLUMN faturas.superpay_status_code IS 'Código de status numérico do SuperPay (1-10)';
COMMENT ON COLUMN faturas.superpay_status_title IS 'Título do status do SuperPay';
COMMENT ON COLUMN faturas.superpay_status_description IS 'Descrição detalhada do status do SuperPay';
COMMENT ON COLUMN faturas.gateway IS 'Gateway de pagamento utilizado (pix, cartao, etc)';
COMMENT ON COLUMN faturas.pay_id IS 'ID único do pagamento no gateway';
COMMENT ON COLUMN faturas.redirect_type IS 'Tipo de redirecionamento (checkout, activation)';
COMMENT ON COLUMN faturas.callback_url IS 'URL de callback para notificações';
COMMENT ON COLUMN faturas.paid_at IS 'Data e hora do pagamento confirmado';
