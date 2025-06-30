-- Adicionar colunas específicas para SuperPay webhook
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS superpay_status_code INTEGER;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS superpay_status_title TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS superpay_status_description TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS gateway TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS pay_id TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS redirect_type TEXT DEFAULT 'checkout'; -- 'checkout' ou 'activation'

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_faturas_superpay_status ON faturas(superpay_status_code);
CREATE INDEX IF NOT EXISTS idx_faturas_gateway ON faturas(gateway);
CREATE INDEX IF NOT EXISTS idx_faturas_redirect_type ON faturas(redirect_type);

-- Comentários para documentação
COMMENT ON COLUMN faturas.superpay_status_code IS 'Código de status da SuperPay (1-10)';
COMMENT ON COLUMN faturas.superpay_status_title IS 'Título do status da SuperPay';
COMMENT ON COLUMN faturas.superpay_status_description IS 'Descrição do status da SuperPay';
COMMENT ON COLUMN faturas.gateway IS 'Gateway de pagamento (gerencianet, etc)';
COMMENT ON COLUMN faturas.pay_id IS 'ID do pagamento no gateway';
COMMENT ON COLUMN faturas.redirect_type IS 'Tipo de redirecionamento: checkout -> /upp/001, activation -> /upp10';
