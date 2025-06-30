-- Script SQL universal para criar tabela SuperPay no Supabase
-- Este script funciona para TODOS os PIX gerados, não apenas um específico
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela payment_webhooks se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    status_code INTEGER NOT NULL,
    status_name TEXT NOT NULL,
    status_title TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMPTZ,
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    gateway TEXT DEFAULT 'superpaybr',
    token TEXT,
    expires_at TIMESTAMPTZ,
    UNIQUE(external_id, gateway)
);

-- Criar índices para performance otimizada
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_critical ON payment_webhooks(is_critical);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_external_id ON payment_webhooks(gateway, external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_status ON payment_webhooks(gateway, status_code);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de teste para todos os status SuperPayBR
INSERT INTO payment_webhooks (external_id, invoice_id, status_code, status_name, status_title, amount, payment_date, webhook_data, processed_at, is_paid, is_denied, is_expired, is_canceled, is_critical, gateway, token, expires_at) VALUES
-- Status 1: Aguardando Pagamento
('TEST_SUPERPAY_001', 'INV_001', 1, 'pending', 'Aguardando Pagamento', 34.90, NULL, '{"test": true, "status": 1}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_001', NOW() + INTERVAL '15 minutes'),

-- Status 2: Em Processamento
('TEST_SUPERPAY_002', 'INV_002', 2, 'processing', 'Em Processamento', 49.90, NULL, '{"test": true, "status": 2}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_002', NOW() + INTERVAL '15 minutes'),

-- Status 3: Pagamento Agendado
('TEST_SUPERPAY_003', 'INV_003', 3, 'scheduled', 'Pagamento Agendado', 39.90, NULL, '{"test": true, "status": 3}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_003', NOW() + INTERVAL '15 minutes'),

-- Status 4: Autorizado
('TEST_SUPERPAY_004', 'INV_004', 4, 'authorized', 'Autorizado', 54.90, NULL, '{"test": true, "status": 4}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_004', NOW() + INTERVAL '15 minutes'),

-- Status 5: Pago (CRÍTICO) - Exemplo genérico
('TEST_SUPERPAY_005', 'INV_005', 5, 'paid', 'Pagamento Confirmado', 29.90, NOW(), '{"test": true, "status": 5}', NOW(), TRUE, FALSE, FALSE, FALSE, TRUE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_005', NOW() + INTERVAL '15 minutes'),

-- Status 6: Cancelado (CRÍTICO)
('TEST_SUPERPAY_006', 'INV_006', 6, 'canceled', 'Cancelado', 39.90, NULL, '{"test": true, "status": 6}', NOW(), FALSE, FALSE, FALSE, TRUE, TRUE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_006', NOW() + INTERVAL '15 minutes'),

-- Status 7: Aguardando Estorno
('TEST_SUPERPAY_007', 'INV_007', 7, 'refund_pending', 'Aguardando Estorno', 44.90, NULL, '{"test": true, "status": 7}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_007', NOW() + INTERVAL '15 minutes'),

-- Status 8: Parcialmente Estornado
('TEST_SUPERPAY_008', 'INV_008', 8, 'partially_refunded', 'Parcialmente Estornado', 59.90, NULL, '{"test": true, "status": 8}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_008', NOW() + INTERVAL '15 minutes'),

-- Status 9: Estornado (CRÍTICO)
('TEST_SUPERPAY_009', 'INV_009', 9, 'refunded', 'Estornado', 59.90, NULL, '{"test": true, "status": 9}', NOW(), FALSE, FALSE, FALSE, FALSE, TRUE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_009', NOW() + INTERVAL '15 minutes'),

-- Status 10: Contestado
('TEST_SUPERPAY_010', 'INV_010', 10, 'disputed', 'Contestado', 64.90, NULL, '{"test": true, "status": 10}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_010', NOW() + INTERVAL '15 minutes'),

-- Status 12: Pagamento Negado (CRÍTICO)
('TEST_SUPERPAY_012', 'INV_012', 12, 'denied', 'Pagamento Negado', 44.90, NULL, '{"test": true, "status": 12}', NOW(), FALSE, TRUE, FALSE, FALSE, TRUE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_012', NOW() + INTERVAL '15 minutes'),

-- Status 15: Pagamento Vencido (CRÍTICO)
('TEST_SUPERPAY_015', 'INV_015', 15, 'expired', 'Pagamento Vencido', 24.90, NULL, '{"test": true, "status": 15}', NOW(), FALSE, FALSE, TRUE, FALSE, TRUE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_015', NOW() + INTERVAL '15 minutes'),

-- Status 16: Erro no Pagamento (CRÍTICO)
('TEST_SUPERPAY_016', 'INV_016', 16, 'error', 'Erro no Pagamento', 19.90, NULL, '{"test": true, "status": 16}', NOW(), FALSE, FALSE, FALSE, FALSE, TRUE, 'superpaybr', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_016', NOW() + INTERVAL '15 minutes'),

-- Token expirado para teste
('TEST_SUPERPAY_EXPIRED', 'INV_EXPIRED', 1, 'pending', 'Aguardando Pagamento', 19.90, NULL, '{"test": true, "expired": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpaybr', 'SPY_EXPIRED_TOKEN', NOW() - INTERVAL '1 hour')

ON CONFLICT (external_id, gateway) DO UPDATE SET
    status_code = EXCLUDED.status_code,
    status_name = EXCLUDED.status_name,
    status_title = EXCLUDED.status_title,
    amount = EXCLUDED.amount,
    payment_date = EXCLUDED.payment_date,
    webhook_data = EXCLUDED.webhook_data,
    processed_at = EXCLUDED.processed_at,
    is_paid = EXCLUDED.is_paid,
    is_denied = EXCLUDED.is_denied,
    is_expired = EXCLUDED.is_expired,
    is_canceled = EXCLUDED.is_canceled,
    is_critical = EXCLUDED.is_critical,
    token = EXCLUDED.token,
    expires_at = EXCLUDED.expires_at;

-- Função para limpeza automática de dados antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_webhooks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM payment_webhooks 
    WHERE gateway = 'superpaybr' 
    AND expires_at < NOW() - INTERVAL '7 days'
    AND external_id LIKE 'TEST_%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Verificar dados inseridos
SELECT 
    'Sistema SuperPay configurado com sucesso!' as message,
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE is_paid = TRUE) as paid_count,
    COUNT(*) FILTER (WHERE is_denied = TRUE) as denied_count,
    COUNT(*) FILTER (WHERE is_expired = TRUE) as expired_count,
    COUNT(*) FILTER (WHERE is_canceled = TRUE) as canceled_count,
    COUNT(*) FILTER (WHERE is_critical = TRUE) as critical_count,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens,
    ROUND(SUM(amount), 2) as total_amount
FROM payment_webhooks 
WHERE gateway = 'superpaybr';

-- Mostrar alguns registros de exemplo
SELECT 
    external_id,
    status_code,
    status_title,
    amount,
    is_paid,
    is_critical,
    expires_at > NOW() as token_valid,
    processed_at
FROM payment_webhooks 
WHERE gateway = 'superpaybr'
ORDER BY processed_at DESC 
LIMIT 10;

-- Função para consultar status de qualquer PIX
CREATE OR REPLACE FUNCTION get_payment_status(p_external_id TEXT)
RETURNS TABLE(
    external_id TEXT,
    status_code INTEGER,
    status_title TEXT,
    amount DECIMAL,
    is_paid BOOLEAN,
    is_critical BOOLEAN,
    payment_date TIMESTAMPTZ,
    processed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pw.external_id,
        pw.status_code,
        pw.status_title,
        pw.amount,
        pw.is_paid,
        pw.is_critical,
        pw.payment_date,
        pw.processed_at
    FROM payment_webhooks pw
    WHERE pw.external_id = p_external_id
    AND pw.gateway = 'superpaybr'
    ORDER BY pw.processed_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Comentário final
SELECT 'Tabela payment_webhooks criada e configurada para detectar TODOS os PIX gerados!' as status,
       'Execute /checkout para testar com qualquer PIX' as next_step,
       'O sistema agora funciona universalmente para qualquer external_id' as note;
