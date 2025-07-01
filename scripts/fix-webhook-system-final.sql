-- Remover tabela existente se houver
DROP TABLE IF EXISTS payment_webhooks CASCADE;

-- Criar tabela payment_webhooks completa
CREATE TABLE payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    token TEXT,
    gateway TEXT NOT NULL DEFAULT 'superpay',
    status_code INTEGER NOT NULL DEFAULT 1,
    status_name TEXT NOT NULL DEFAULT 'pending',
    status_title TEXT NOT NULL DEFAULT 'Aguardando Pagamento',
    status_description TEXT,
    status_text TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMPTZ,
    payment_due TIMESTAMPTZ,
    payment_gateway TEXT DEFAULT 'SuperPay',
    qr_code TEXT,
    pix_code TEXT,
    barcode TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    customer_id TEXT DEFAULT 'UNKNOWN',
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX idx_payment_webhooks_status ON payment_webhooks(status_code);
CREATE INDEX idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE UNIQUE INDEX idx_payment_webhooks_unique ON payment_webhooks(external_id, gateway);

-- Habilitar Realtime para a tabela
ALTER TABLE payment_webhooks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;

-- Inserir webhook para o External ID atual como PAGO
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    gateway,
    status_code,
    status_name,
    status_title,
    status_description,
    amount,
    payment_date,
    is_paid,
    customer_id,
    webhook_data,
    processed_at,
    updated_at
) VALUES (
    'SHEIN_1751359227218_sns8rbodz',
    'SHEIN_1751359227218_sns8rbodz',
    'superpay',
    5,
    'paid',
    'Pagamento Confirmado!',
    'Pagamento PIX confirmado via SuperPay',
    0.28,
    NOW(),
    TRUE,
    'ERROL JAIME GARCIA PEREZ',
    '{"event": {"type": "webhook.update"}, "invoices": {"status": {"code": 5, "title": "Pagamento Confirmado!"}, "external_id": "SHEIN_1751359227218_sns8rbodz", "prices": {"total": 0.28}}}',
    NOW(),
    NOW()
)
ON CONFLICT (external_id, gateway) 
DO UPDATE SET
    status_code = 5,
    status_name = 'paid',
    status_title = 'Pagamento Confirmado!',
    is_paid = TRUE,
    payment_date = NOW(),
    updated_at = NOW();

-- Verificar se foi inserido
SELECT 
    external_id,
    status_code,
    status_title,
    is_paid,
    amount,
    processed_at
FROM payment_webhooks 
WHERE external_id = 'SHEIN_1751359227218_sns8rbodz';

-- Configurar políticas de segurança (RLS)
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública
CREATE POLICY "Allow public read access" ON payment_webhooks
    FOR SELECT USING (true);

-- Política para inserção/atualização via service role
CREATE POLICY "Allow service role full access" ON payment_webhooks
    FOR ALL USING (auth.role() = 'service_role');

-- Confirmar configuração
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'payment_webhooks';

-- Mostrar status final
SELECT 'Webhook system configured successfully!' as status;
