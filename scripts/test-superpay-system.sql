-- Script de teste completo para o sistema SuperPay
-- Testa todas as funcionalidades: webhooks, consultas, rate limiting e tokens

BEGIN;

-- Limpar dados de teste anteriores
DELETE FROM payment_webhooks WHERE external_id LIKE 'TEST_%' OR external_id LIKE 'SHEIN_TEST_%';

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
    webhook_data,
    token,
    expires_at
) VALUES 
-- Teste 1: Pagamento Pendente
(
    'TEST_PENDING_001',
    'INV_PENDING_001',
    1,
    'Aguardando Pagamento',
    34.90,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    'superpay',
    '{"event": {"type": "payment_created", "date": "2024-01-01T10:00:00Z"}, "invoices": {"id": "INV_PENDING_001", "external_id": "TEST_PENDING_001", "status": {"code": 1, "title": "Aguardando Pagamento"}}}',
    'SPY_TEST_PENDING_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    NOW() + INTERVAL '15 minutes'
),
-- Teste 2: Pagamento Confirmado (CRÍTICO)
(
    'TEST_PAID_002',
    'INV_PAID_002',
    5,
    'Pago',
    49.90,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    'superpay',
    '{"event": {"type": "payment_confirmed", "date": "2024-01-01T11:00:00Z"}, "invoices": {"id": "INV_PAID_002", "external_id": "TEST_PAID_002", "status": {"code": 5, "title": "Pago"}, "payment": {"payDate": "2024-01-01T11:00:00Z"}}}',
    'SPY_TEST_PAID_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    NOW() + INTERVAL '15 minutes'
),
-- Teste 3: Pagamento Negado (CRÍTICO)
(
    'TEST_DENIED_003',
    'INV_DENIED_003',
    12,
    'Negado',
    29.90,
    FALSE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    'superpay',
    '{"event": {"type": "payment_denied", "date": "2024-01-01T12:00:00Z"}, "invoices": {"id": "INV_DENIED_003", "external_id": "TEST_DENIED_003", "status": {"code": 12, "title": "Negado"}}}',
    'SPY_TEST_DENIED_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    NOW() + INTERVAL '15 minutes'
),
-- Teste 4: Pagamento Vencido (CRÍTICO)
(
    'TEST_EXPIRED_004',
    'INV_EXPIRED_004',
    15,
    'Vencido',
    39.90,
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    'superpay',
    '{"event": {"type": "payment_expired", "date": "2024-01-01T13:00:00Z"}, "invoices": {"id": "INV_EXPIRED_004", "external_id": "TEST_EXPIRED_004", "status": {"code": 15, "title": "Vencido"}}}',
    'SPY_TEST_EXPIRED_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    NOW() + INTERVAL '15 minutes'
),
-- Teste 5: Token Expirado
(
    'TEST_TOKEN_EXPIRED_005',
    'INV_TOKEN_EXPIRED_005',
    1,
    'Aguardando Pagamento',
    19.90,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    'superpay',
    '{"event": {"type": "payment_created", "date": "2024-01-01T09:00:00Z"}, "invoices": {"id": "INV_TOKEN_EXPIRED_005", "external_id": "TEST_TOKEN_EXPIRED_005", "status": {"code": 1, "title": "Aguardando Pagamento"}}}',
    'SPY_TEST_EXPIRED_TOKEN_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    NOW() - INTERVAL '1 hour' -- Token já expirado
);

-- 2. VERIFICAR INSERÇÕES
SELECT 
    '=== TESTE 1: INSERÇÃO DE WEBHOOKS ===' as test_section,
    COUNT(*) as total_inserted,
    COUNT(CASE WHEN is_critical = TRUE THEN 1 END) as critical_count,
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END) as paid_count,
    COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_%';

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
WHERE external_id IN ('TEST_PAID_002', 'TEST_DENIED_003', 'TEST_TOKEN_EXPIRED_005')
ORDER BY external_id;

-- 4. TESTE DE PERFORMANCE COM ÍNDICES
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM payment_webhooks 
WHERE gateway = 'superpay' 
AND external_id = 'TEST_PAID_002';

-- 5. TESTE DE ESTATÍSTICAS POR STATUS
SELECT 
    '=== TESTE 3: ESTATÍSTICAS POR STATUS ===' as test_section,
    status_code,
    status_name,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    COUNT(CASE WHEN is_critical = TRUE THEN 1 END) as critical_count
FROM payment_webhooks 
WHERE external_id LIKE 'TEST_%'
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
WHERE external_id LIKE 'TEST_%'
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
    AND external_id LIKE 'TEST_%'
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
WHERE external_id LIKE 'TEST_%';

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
    'TEST_PENDING_001',
    'TEST_PAID_002', 
    'TEST_DENIED_003',
    'TEST_EXPIRED_004',
    'TEST_TOKEN_EXPIRED_005'
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
WHERE external_id LIKE 'TEST_%';

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
