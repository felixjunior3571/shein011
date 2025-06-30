-- Adicionar colunas específicas para SuperPay webhook
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS superpay_status_code INTEGER;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS superpay_status_title TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS superpay_status_description TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS gateway TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS pay_id TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca rápida por external_id
CREATE INDEX IF NOT EXISTS idx_faturas_external_id ON faturas(external_id);

-- Criar índice para busca por status
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);

-- Criar índice para busca por superpay_status_code
CREATE INDEX IF NOT EXISTS idx_faturas_superpay_status_code ON faturas(superpay_status_code);

-- Comentários para documentação
COMMENT ON COLUMN faturas.superpay_status_code IS 'Código de status da SuperPay (1-10)';
COMMENT ON COLUMN faturas.superpay_status_title IS 'Título do status da SuperPay';
COMMENT ON COLUMN faturas.superpay_status_description IS 'Descrição do status da SuperPay';
COMMENT ON COLUMN faturas.gateway IS 'Gateway de pagamento (ex: gerencianet)';
COMMENT ON COLUMN faturas.pay_id IS 'ID do pagamento no gateway';
COMMENT ON COLUMN faturas.paid_at IS 'Data/hora do pagamento confirmado';
