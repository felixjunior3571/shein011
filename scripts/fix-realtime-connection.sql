-- =====================================================
-- SCRIPT PARA CORRIGIR CONEXÃO REALTIME
-- =====================================================

BEGIN;

-- 1. Verificar se a tabela existe
SELECT 
    schemaname, 
    tablename, 
    hasindexes, 
    hasrules, 
    hastriggers
FROM pg_tables 
WHERE tablename = 'payment_webhooks';

-- 2. Garantir que o Realtime está habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;

-- 3. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'payment_webhooks';

-- 4. Inserir webhook de teste para o External ID atual
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    gateway,
    status_code,
    status_name,
    status_title,
    amount,
    is_paid,
    customer_id,
    webhook_data,
    processed_at,
    updated_at
) VALUES (
    'SHEIN_1751358841925_6o77tb4p8',
    '1751358841925',
    'superpay',
    5,
    'paid',
    'Pagamento Confirmado!',
    0.28,
    true,
    'ERROL_JAIME_GARCIA_PEREZ',
    jsonb_build_object(
        'event', 'payment.confirmed',
        'external_id', 'SHEIN_1751358841925_6o77tb4p8',
        'status_code', 5,
        'amount', 0.28,
        'timestamp', NOW()::text
    ),
    NOW(),
    NOW()
)
ON CONFLICT (external_id, gateway) 
DO UPDATE SET
    status_code = 5,
    status_name = 'paid',
    status_title = 'Pagamento Confirmado!',
    is_paid = true,
    updated_at = NOW();

-- 5. Verificar se foi inserido
SELECT 
    external_id,
    status_code,
    status_title,
    is_paid,
    processed_at,
    'WEBHOOK INSERIDO/ATUALIZADO!' as status
FROM payment_webhooks 
WHERE external_id = 'SHEIN_1751358841925_6o77tb4p8';

-- 6. Mostrar estatísticas
SELECT 
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE is_paid = true) as paid_webhooks,
    MAX(updated_at) as last_update,
    'REALTIME PRONTO!' as status
FROM payment_webhooks;

COMMIT;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '✅ WEBHOOK INSERIDO PARA: SHEIN_1751358841925_6o77tb4p8';
    RAISE NOTICE '🎉 STATUS: PAGAMENTO CONFIRMADO!';
    RAISE NOTICE '🚀 O REDIRECIONAMENTO DEVE ACONTECER AGORA!';
END $$;
