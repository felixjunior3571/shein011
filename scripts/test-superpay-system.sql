-- Script para testar o sistema SuperPay
-- Execute este script para verificar se tudo está funcionando

-- 1. Verificar se a tabela existe
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'payment_webhooks';

-- 2. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks' 
ORDER BY ordinal_position;

-- 3. Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'payment_webhooks';

-- 4. Inserir dados de teste SuperPay
INSERT INTO payment_webhooks (
    external_id, 
    invoice_id, 
    status_code, 
    status_name, 
    amount, 
    gateway,
    token,
    expires_at,
    webhook_data,
    is_paid,
    is_denied,
    is_expired,
    is_canceled,
    is_refunded
) VALUES 
-- Teste 1: Pagamento pendente
(
    'TEST_SUPERPAY_PENDING_001',
    'INV_TEST_PENDING_001',
    1,
    'Aguardando Pagamento',
    34.90,
    'superpay',
    'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_pending',
    NOW() + INTERVAL '15 minutes',
    '{"event": {"type": "invoice.created"}, "invoices": {"id": "INV_TEST_PENDING_001", "external_id": "TEST_SUPERPAY_PENDING_001", "status": {"code": 1}}}'::jsonb,
    false,
    false,
    false,
    false,
    false
),
-- Teste 2: Pagamento confirmado
(
    'TEST_SUPERPAY_PAID_002',
    'INV_TEST_PAID_002',
    5,
    'Pago',
    34.90,
    'superpay',
    'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_paid',
    NOW() + INTERVAL '15 minutes',
    '{"event": {"type": "invoice.status_changed"}, "invoices": {"id": "INV_TEST_PAID_002", "external_id": "TEST_SUPERPAY_PAID_002", "status": {"code": 5}}}'::jsonb,
    true,
    false,
    false,
    false,
    false
),
-- Teste 3: Pagamento negado
(
    'TEST_SUPERPAY_DENIED_003',
    'INV_TEST_DENIED_003',
    12,
    'Negado',
    34.90,
    'superpay',
    'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_denied',
    NOW() + INTERVAL '15 minutes',
    '{"event": {"type": "invoice.status_changed"}, "invoices": {"id": "INV_TEST_DENIED_003", "external_id": "TEST_SUPERPAY_DENIED_003", "status": {"code": 12}}}'::jsonb,
    false,
    true,
    false,
    false,
    false
),
-- Teste 4: Token expirado
(
    'TEST_SUPERPAY_EXPIRED_004',
    'INV_TEST_EXPIRED_004',
    1,
    'Aguardando Pagamento',
    34.90,
    'superpay',
    'SPY_' || EXTRACT(EPOCH FROM NOW()) || '_expired',
    NOW() - INTERVAL '1 hour', -- Token já expirado
    '{"event": {"type": "invoice.created"}, "invoices": {"id": "INV_TEST_EXPIRED_004", "external_id": "TEST_SUPERPAY_EXPIRED_004", "status": {"code": 1}}}'::jsonb,
    false,
    false,
    false,
    false,
    false
)
ON CONFLICT (external_id, gateway) DO UPDATE SET
    status_code = EXCLUDED.status_code,
    status_name = EXCLUDED.status_name,
    token = EXCLUDED.token,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

-- 5. Verificar dados inseridos
SELECT 
    id,
    external_id,
    status_name,
    amount,
    is_paid,
    is_denied,
    token,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN 'EXPIRADO'
        ELSE 'VÁLIDO'
    END as token_status,
    processed_at
FROM payment_webhooks 
WHERE gateway = 'superpay'
ORDER BY processed_at DESC;

-- 6. Estatísticas do sistema SuperPay
SELECT 
    'SuperPay' as gateway,
    COUNT(*) as total_webhooks,
    COUNT(CASE WHEN is_paid = true THEN 1 END) as paid_count,
    COUNT(CASE WHEN is_denied = true THEN 1 END) as denied_count,
    COUNT(CASE WHEN is_expired = true THEN 1 END) as expired_count,
    COUNT(CASE WHEN is_canceled = true THEN 1 END) as canceled_count,
    COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
    SUM(amount) as total_amount,
    SUM(CASE WHEN is_paid = true THEN amount ELSE 0 END) as paid_amount,
    MIN(processed_at) as first_webhook,
    MAX(processed_at) as last_webhook
FROM payment_webhooks 
WHERE gateway = 'superpay';

-- 7. Verificar tokens válidos vs expirados
SELECT 
    'Tokens Válidos' as tipo,
    COUNT(*) as quantidade
FROM payment_webhooks 
WHERE gateway = 'superpay' 
AND expires_at > NOW()

UNION ALL

SELECT 
    'Tokens Expirados' as tipo,
    COUNT(*) as quantidade
FROM payment_webhooks 
WHERE gateway = 'superpay' 
AND expires_at <= NOW();

-- 8. Últimos 10 webhooks SuperPay
SELECT 
    external_id,
    status_name,
    amount,
    CASE 
        WHEN is_paid THEN '✅ Pago'
        WHEN is_denied THEN '❌ Negado'
        WHEN is_expired THEN '⏰ Vencido'
        WHEN is_canceled THEN '🚫 Cancelado'
        WHEN is_refunded THEN '🔄 Estornado'
        ELSE '⏳ Pendente'
    END as status_emoji,
    token,
    CASE 
        WHEN expires_at < NOW() THEN '🔴 EXPIRADO'
        ELSE '🟢 VÁLIDO'
    END as token_status,
    processed_at
FROM payment_webhooks 
WHERE gateway = 'superpay'
ORDER BY processed_at DESC
LIMIT 10;

-- 9. Limpeza de tokens expirados (opcional)
-- DELETE FROM payment_webhooks 
-- WHERE gateway = 'superpay' 
-- AND expires_at < NOW() - INTERVAL '1 day'
-- AND is_paid = false;

COMMIT;

-- Mensagem de sucesso
SELECT '🎉 Sistema SuperPay testado com sucesso! Verifique os resultados acima.' as resultado;
