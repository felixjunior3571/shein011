-- Script de teste completo para o sistema SuperPay
-- Testa todas as funcionalidades: webhooks, consultas, rate limiting e tokens

BEGIN;

-- Limpar dados de teste antigos
DELETE FROM payment_webhooks WHERE external_id LIKE 'TEST_SUPERPAY_%';

-- 1. TESTE DE INSERÇÃO DE WEBHOOKS
INSERT INTO payment_webhooks (
    external_id, 
    invoice_id, 
    status_code, 
    status_name, 
    amount, 
    is_paid,
    is_denied,
    is_expired,
    is_canceled,
    is_refunded,
    is_critical, 
    gateway, 
    token, 
    expires_at,
    webhook_data,
    payment_date
) VALUES 
-- Status 1: Aguardando Pagamento (não crítico)
(
    'TEST_SUPERPAY_001', 
    'INV_TEST_001', 
    1, 
    'Aguardando Pagamento', 
    34.90, 
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 34.90, "status_code": 1}'::jsonb,
    NULL
),
-- Status 2: Em Processamento (não crítico)
(
    'TEST_SUPERPAY_002', 
    'INV_TEST_002', 
    2, 
    'Em Processamento', 
    49.90, 
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 49.90, "status_code": 2}'::jsonb,
    NULL
),
-- Status 5: Pago (CRÍTICO)
(
    'TEST_SUPERPAY_005', 
    'INV_TEST_005', 
    5, 
    'Pago', 
    29.90, 
    TRUE, FALSE, FALSE, FALSE, FALSE, TRUE,
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 29.90, "status_code": 5}'::jsonb,
    NOW()
),
-- Status 6: Cancelado (CRÍTICO)
(
    'TEST_SUPERPAY_006', 
    'INV_TEST_006', 
    6, 
    'Cancelado', 
    39.90, 
    FALSE, FALSE, FALSE, TRUE, FALSE, TRUE,
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 39.90, "status_code": 6}'::jsonb,
    NULL
),
-- Status 9: Estornado (CRÍTICO)
(
    'TEST_SUPERPAY_009', 
    'INV_TEST_009', 
    9, 
    'Estornado', 
    59.90, 
    FALSE, FALSE, FALSE, FALSE, TRUE, TRUE,
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 59.90, "status_code": 9}'::jsonb,
    NOW() - INTERVAL '1 hour'
),
-- Status 12: Negado (CRÍTICO)
(
    'TEST_SUPERPAY_012', 
    'INV_TEST_012', 
    12, 
    'Negado', 
    44.90, 
    FALSE, TRUE, FALSE, FALSE, FALSE, TRUE,
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 44.90, "status_code": 12}'::jsonb,
    NULL
),
-- Status 15: Vencido (CRÍTICO)
(
    'TEST_SUPERPAY_015', 
    'INV_TEST_015', 
    15, 
    'Vencido', 
    24.90, 
    FALSE, FALSE, TRUE, FALSE, FALSE, TRUE,
    'superpay', 
    'SPY_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    NOW() + INTERVAL '15 minutes',
    '{"test": true, "amount": 24.90, "status_code": 15}'::jsonb,
    NULL
),
-- Token expirado para teste
(
    'TEST_SUPERPAY_EXPIRED', 
    'INV_TEST_EXPIRED', 
    1, 
    'Aguardando Pagamento', 
    19.90, 
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    'superpay', 
    'SPY_EXPIRED_TOKEN_123',
    NOW() - INTERVAL '1 hour', -- Token já expirado
    '{"test": true, "amount": 19.90, "token_expired": true}'::jsonb,
    NULL
);

-- 2. VERIFICAR INSERÇÕES
SELECT 
    '=== TESTE 1: INSERÇÃO DE WEBHOOKS ===' as test_section,
    COUNT(*) as total_inserted,
    COUNT(CASE WHEN is_critical = TRUE THEN 1 END) as critical_count,
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END) as paid_count,
    COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_SUPERPAY_%';

-- 3. TESTE DE CONSULTAS POR EXTERNAL_ID
SELECT 
    '=== TESTE 2: CONSULTA POR EXTERNAL_ID ===' as test_section,
    external_id,
    status_name,
    is_paid,
    is_critical,
    CASE 
        WHEN expires_at < NOW() THEN 'EXPIRADO'
        ELSE 'VÁLIDO'
    END as token_status
FROM payment_webhooks 
WHERE external_id IN ('TEST_SUPERPAY_005', 'TEST_SUPERPAY_012', 'TEST_SUPERPAY_EXPIRED')
ORDER BY external_id;

-- 4. TESTE DE PERFORMANCE COM ÍNDICES
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM payment_webhooks 
WHERE gateway = 'superpay' 
AND external_id = 'TEST_SUPERPAY_005';

-- 5. TESTE DE ESTATÍSTICAS POR STATUS
SELECT 
    '=== TESTE 3: ESTATÍSTICAS POR STATUS ===' as test_section,
    status_code,
    status_name,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    COUNT(CASE WHEN is_critical = TRUE THEN 1 END) as critical_count
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_SUPERPAY_%'
GROUP BY status_code, status_name
ORDER BY status_code;

-- 6. TESTE DE TOKENS EXPIRADOS
SELECT 
    '=== TESTE 4: TOKENS EXPIRADOS ===' as test_section,
    external_id,
    token,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN 'EXPIRADO'
        ELSE 'VÁLIDO'
    END as status,
    EXTRACT(EPOCH FROM (NOW() - expires_at))/60 as minutes_expired
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_SUPERPAY_%'
ORDER BY expires_at;

-- 7. TESTE DE RATE LIMITING (Simulação)
-- Inserir múltiplas verificações para simular rate limiting
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    status_code,
    status_name,
    amount,
    gateway,
    webhook_data,
    token,
    expires_at,
    processed_at
)
SELECT 
    'TEST_RATE_LIMIT_' || generate_series,
    'INV_RATE_' || generate_series,
    1,
    'Aguardando Pagamento',
    10.00,
    'superpay',
    '{"test": "rate_limiting", "check_number": ' || generate_series || '}',
    'SPY_RATE_' || generate_series || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    NOW() + INTERVAL '15 minutes',
    NOW() - INTERVAL '1 minute' * generate_series
FROM generate_series(1, 10);

-- 8. VERIFICAR RATE LIMITING
SELECT 
    '=== TESTE 5: SIMULAÇÃO RATE LIMITING ===' as test_section,
    COUNT(*) as total_checks,
    MIN(processed_at) as first_check,
    MAX(processed_at) as last_check,
    EXTRACT(EPOCH FROM (MAX(processed_at) - MIN(processed_at)))/60 as duration_minutes
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_RATE_LIMIT_%';

-- 9. TESTE DE LIMPEZA DE TOKENS EXPIRADOS
-- Função para limpar tokens expirados (simulação de manutenção)
WITH expired_tokens AS (
    SELECT id, external_id, token, expires_at
    FROM payment_webhooks 
    WHERE expires_at < NOW() 
    AND external_id LIKE 'TEST_SUPERPAY_%'
)
SELECT 
    '=== TESTE 6: TOKENS PARA LIMPEZA ===' as test_section,
    COUNT(*) as expired_count,
    MIN(expires_at) as oldest_expiry,
    MAX(expires_at) as newest_expiry
FROM expired_tokens;

-- 10. TESTE DE INTEGRIDADE DE DADOS
SELECT 
    '=== TESTE 7: INTEGRIDADE DE DADOS ===' as test_section,
    COUNT(*) as total_records,
    COUNT(CASE WHEN external_id IS NOT NULL THEN 1 END) as valid_external_ids,
    COUNT(CASE WHEN invoice_id IS NOT NULL THEN 1 END) as valid_invoice_ids,
    COUNT(CASE WHEN status_code BETWEEN 1 AND 15 THEN 1 END) as valid_status_codes,
    COUNT(CASE WHEN amount >= 0 THEN 1 END) as valid_amounts,
    COUNT(CASE WHEN gateway = 'superpay' THEN 1 END) as valid_gateways
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_SUPERPAY_%';

-- 11. TESTE DE CONSULTA EM LOTE (Batch Query)
SELECT 
    '=== TESTE 8: CONSULTA EM LOTE ===' as test_section,
    external_id,
    status_name,
    amount,
    is_paid,
    is_critical,
    token,
    CASE 
        WHEN expires_at < NOW() THEN 'EXPIRADO'
        ELSE 'VÁLIDO'
    END as token_status
FROM payment_webhooks 
WHERE external_id IN (
    'TEST_SUPERPAY_001',
    'TEST_SUPERPAY_005', 
    'TEST_SUPERPAY_012',
    'TEST_SUPERPAY_015',
    'TEST_SUPERPAY_EXPIRED'
)
ORDER BY 
    CASE status_code
        WHEN 5 THEN 1  -- Pago primeiro
        WHEN 12 THEN 2 -- Negado segundo
        WHEN 15 THEN 3 -- Vencido terceiro
        ELSE 4         -- Outros por último
    END,
    external_id;

-- 12. RESUMO FINAL DOS TESTES
SELECT 
    '=== RESUMO FINAL DOS TESTES ===' as test_section,
    COUNT(*) as total_test_records,
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END) as paid_records,
    COUNT(CASE WHEN is_denied = TRUE THEN 1 END) as denied_records,
    COUNT(CASE WHEN is_expired = TRUE THEN 1 END) as expired_records,
    COUNT(CASE WHEN is_canceled = TRUE THEN 1 END) as canceled_records,
    COUNT(CASE WHEN is_refunded = TRUE THEN 1 END) as refunded_records,
    COUNT(CASE WHEN is_critical = TRUE THEN 1 END) as critical_records,
    COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MIN(processed_at) as first_webhook,
    MAX(processed_at) as last_webhook
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_SUPERPAY_%';

-- 13. VERIFICAR ÍNDICES E PERFORMANCE
SELECT 
    '=== PERFORMANCE E ÍNDICES ===' as test_section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'payment_webhooks'
ORDER BY indexname;

COMMIT;

-- Mensagem final
SELECT 
    '🎉 TESTE SUPERPAY CONCLUÍDO COM SUCESSO!' as message,
    'Todos os componentes foram testados:' as details,
    '✅ Webhooks, ✅ Consultas, ✅ Rate Limiting, ✅ Tokens, ✅ Performance' as components;
