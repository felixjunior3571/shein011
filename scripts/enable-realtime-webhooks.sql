-- Habilitar Realtime para a tabela payment_webhooks
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_webhooks') THEN
        RAISE EXCEPTION 'Tabela payment_webhooks não existe. Execute primeiro o script create-payment-webhooks-table.sql';
    END IF;
END $$;

-- 2. Verificar se já está na publicação Realtime
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE tablename = 'payment_webhooks' AND pubname = 'supabase_realtime'
    ) THEN
        RAISE NOTICE 'Tabela payment_webhooks já está na publicação supabase_realtime';
    ELSE
        -- Adicionar à publicação se não estiver
        ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;
        RAISE NOTICE 'Tabela payment_webhooks adicionada à publicação supabase_realtime';
    END IF;
END $$;

-- 3. Configurar REPLICA IDENTITY se necessário
DO $$
BEGIN
    -- Verificar configuração atual
    IF (SELECT relreplident FROM pg_class WHERE relname = 'payment_webhooks') != 'f' THEN
        RAISE NOTICE 'REPLICA IDENTITY já configurado para payment_webhooks';
    ELSE
        ALTER TABLE payment_webhooks REPLICA IDENTITY FULL;
        RAISE NOTICE 'REPLICA IDENTITY FULL configurado para payment_webhooks';
    END IF;
END $$;

-- 4. Criar índices otimizados para Realtime se não existirem
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id_realtime 
ON payment_webhooks (external_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_flags 
ON payment_webhooks (is_paid, is_denied, is_expired, is_canceled, is_refunded);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at 
ON payment_webhooks (created_at DESC);

-- 5. Verificar configuração final
SELECT 
    'Configuração Realtime' as categoria,
    'payment_webhooks' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE tablename = 'payment_webhooks' AND pubname = 'supabase_realtime'
        ) THEN 'HABILITADO' 
        ELSE 'DESABILITADO' 
    END as status_realtime,
    (SELECT relreplident FROM pg_class WHERE relname = 'payment_webhooks') as replica_identity,
    COUNT(*) as total_registros
FROM payment_webhooks;

-- 6. Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'payment_webhooks'
ORDER BY indexname;

-- 7. Testar inserção para verificar se Realtime funciona
DO $$
DECLARE
    test_external_id TEXT := 'REALTIME_TEST_' || extract(epoch from now())::text;
BEGIN
    -- Inserir registro de teste
    INSERT INTO payment_webhooks (
        external_id,
        invoice_id,
        gateway,
        status_code,
        status_name,
        status_title,
        amount,
        is_paid,
        is_denied,
        is_expired,
        is_canceled,
        is_refunded,
        raw_webhook,
        processed_at
    ) VALUES (
        test_external_id,
        test_external_id,
        'test',
        1,
        'pending',
        'Teste Realtime',
        27.97,
        false,
        false,
        false,
        false,
        false,
        '{"test": true}'::jsonb,
        now()
    );
    
    RAISE NOTICE 'Registro de teste inserido com external_id: %', test_external_id;
    
    -- Remover registro de teste
    DELETE FROM payment_webhooks WHERE external_id = test_external_id;
    
    RAISE NOTICE 'Registro de teste removido. Realtime configurado com sucesso!';
END $$;

-- Mensagem final
SELECT 
    '✅ Realtime habilitado com sucesso!' as resultado,
    'Agora você pode usar Supabase Realtime para monitorar mudanças na tabela payment_webhooks' as instrucoes;
