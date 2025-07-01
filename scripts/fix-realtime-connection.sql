-- Garantir que o Realtime está habilitado para payment_webhooks
ALTER TABLE payment_webhooks REPLICA IDENTITY FULL;

-- Adicionar à publicação do Realtime se não estiver
DO $$
BEGIN
    -- Tentar adicionar à publicação
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;
    EXCEPTION WHEN duplicate_object THEN
        -- Tabela já está na publicação, ignorar erro
        NULL;
    END;
END $$;

-- Verificar se está na publicação
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE tablename = 'payment_webhooks';

-- Inserir webhook de teste para forçar atualização Realtime
INSERT INTO payment_webhooks (
    external_id,
    gateway,
    status_code,
    status_name,
    status_title,
    amount,
    is_paid,
    customer_id,
    processed_at,
    updated_at
) VALUES (
    'SHEIN_1751359227218_sns8rbodz',
    'superpay',
    5,
    'paid',
    'Pagamento Confirmado!',
    0.28,
    TRUE,
    'ERROL JAIME GARCIA PEREZ',
    NOW(),
    NOW()
)
ON CONFLICT (external_id, gateway) 
DO UPDATE SET
    status_code = 5,
    status_name = 'paid',
    status_title = 'Pagamento Confirmado!',
    is_paid = TRUE,
    updated_at = NOW();

-- Confirmar que o webhook foi inserido/atualizado
SELECT 
    'Realtime webhook inserted/updated for: ' || external_id as message,
    status_title,
    is_paid,
    updated_at
FROM payment_webhooks 
WHERE external_id = 'SHEIN_1751359227218_sns8rbodz';
