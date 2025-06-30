-- Script SQL direto para criar tabela SuperPay no Supabase
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
    gateway TEXT DEFAULT 'superpay',
    token TEXT,
    expires_at TIMESTAMPTZ,
    UNIQUE(external_id, gateway)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at);

-- Trigger para atualizar updated_at
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

-- Inserir webhook real baseado no log fornecido
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    status_code,
    status_name,
    status_title,
    amount,
    payment_date,
    webhook_data,
    processed_at,
    is_paid,
    is_denied,
    is_expired,
    is_canceled,
    is_critical,
    gateway,
    token,
    expires_at
) VALUES (
    'SHEIN_1751323218503_8p7uigrw4',
    '1751323527',
    5,
    'paid',
    'Pagamento Confirmado!',
    27.97,
    '2025-06-30 19:42:03',
    '{"event":{"type":"invoice.update","date":"2025-06-30 19:42:03"},"invoices":{"id":"1751323527","external_id":"SHEIN_1751323218503_8p7uigrw4","token":"9f482bd8-95e0-4e3c-abea-62588a13b9b6","date":"2025-06-30 19:40:21","status":{"code":5,"title":"Pagamento Confirmado!","description":"Obrigado pela sua Compra!","text":"approved"},"customer":138491,"prices":{"total":27.97,"discount":0,"taxs":{"others":0},"refound":null},"type":"PIX","payment":{"gateway":"SuperPay","date":"2025-06-30 19:42:03","due":"2025-07-01 00:00:00","card":null,"payId":null,"payDate":"2025-06-30 19:42:03","details":{"barcode":null,"pix_code":null,"qrcode":"00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/dea51f1d-8597-40ab-825c-9d7ae2a37c895204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***63040119","url":null}}}}',
    '2025-06-30 19:42:03',
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    'superpaybr',
    'SPY_1719778923_8p7uigrw4',
    '2025-06-30 19:57:03'
) ON CONFLICT (external_id, gateway) DO UPDATE SET
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

-- Inserir dados de teste para todos os status
INSERT INTO payment_webhooks (external_id, invoice_id, status_code, status_name, status_title, amount, payment_date, webhook_data, processed_at, is_paid, is_denied, is_expired, is_canceled, is_critical, gateway, token, expires_at) VALUES
('TEST_SUPERPAY_001', 'INV_001', 1, 'pending', 'Aguardando Pagamento', 34.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_001', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_002', 'INV_002', 2, 'processing', 'Em Processamento', 49.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_002', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_003', 'INV_003', 3, 'scheduled', 'Pagamento Agendado', 39.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_003', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_004', 'INV_004', 4, 'authorized', 'Autorizado', 54.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_004', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_005', 'INV_005', 5, 'paid', 'Pago', 29.90, NOW(), '{"test": true}', NOW(), TRUE, FALSE, FALSE, FALSE, TRUE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_005', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_006', 'INV_006', 6, 'canceled', 'Cancelado', 39.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, TRUE, TRUE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_006', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_007', 'INV_007', 7, 'refund_pending', 'Aguardando Estorno', 44.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_007', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_008', 'INV_008', 8, 'partially_refunded', 'Parcialmente Estornado', 59.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_008', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_009', 'INV_009', 9, 'refunded', 'Estornado', 59.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, TRUE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_009', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_010', 'INV_010', 10, 'disputed', 'Contestado', 64.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_010', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_012', 'INV_012', 12, 'denied', 'Pagamento Negado', 44.90, NULL, '{"test": true}', NOW(), FALSE, TRUE, FALSE, FALSE, TRUE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_012', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_015', 'INV_015', 15, 'expired', 'Pagamento Vencido', 24.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, TRUE, FALSE, TRUE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_015', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_016', 'INV_016', 16, 'error', 'Erro no Pagamento', 19.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, TRUE, 'superpay', 'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_016', NOW() + INTERVAL '15 minutes'),
('TEST_SUPERPAY_EXPIRED', 'INV_EXPIRED', 1, 'pending', 'Aguardando Pagamento', 19.90, NULL, '{"test": true}', NOW(), FALSE, FALSE, FALSE, FALSE, FALSE, 'superpay', 'SPY_EXPIRED_TOKEN', NOW() - INTERVAL '1 hour')
ON CONFLICT (external_id, gateway) DO NOTHING;

-- Verificar dados inseridos
SELECT 
    'Tabela payment_webhooks criada com sucesso!' as message,
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE is_paid = TRUE) as paid_count,
    COUNT(*) FILTER (WHERE is_denied = TRUE) as denied_count,
    COUNT(*) FILTER (WHERE is_expired = TRUE) as expired_count,
    COUNT(*) FILTER (WHERE is_canceled = TRUE) as canceled_count,
    COUNT(*) FILTER (WHERE is_critical = TRUE) as critical_count,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens,
    ROUND(SUM(amount), 2) as total_amount
FROM payment_webhooks;

-- Mostrar alguns registros de exemplo
SELECT 
    external_id,
    status_code,
    status_title,
    amount,
    is_paid,
    is_critical,
    expires_at > NOW() as token_valid
FROM payment_webhooks 
ORDER BY processed_at DESC 
LIMIT 5;
