-- Habilitar Realtime para a tabela payment_webhooks
-- Execute este script no Supabase SQL Editor

-- 1. Habilitar replicação para a tabela
ALTER TABLE payment_webhooks REPLICA IDENTITY FULL;

-- 2. Habilitar publicação para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;

-- 3. Verificar se está habilitado
SELECT schemaname, tablename, hasinserts, hasupdates, hasdeletes, hastruncates
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'payment_webhooks';

-- 4. Comentário explicativo
COMMENT ON TABLE payment_webhooks IS 'Tabela de webhooks de pagamento com Realtime habilitado para monitoramento em tempo real';
