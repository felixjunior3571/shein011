-- Criar tabela payment_webhooks se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificadores
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    token TEXT,
    gateway TEXT NOT NULL DEFAULT 'superpay',
    
    -- Status
    status_code INTEGER NOT NULL DEFAULT 1,
    status_name TEXT,
    status_title TEXT,
    status_description TEXT,
    status_text TEXT,
    
    -- Valores financeiros
    amount DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,
    
    -- Dados de pagamento
    payment_type TEXT DEFAULT 'PIX',
    payment_gateway TEXT,
    payment_date TIMESTAMPTZ,
    payment_due TIMESTAMPTZ,
    
    -- Códigos de pagamento
    qr_code TEXT,
    pix_code TEXT,
    barcode TEXT,
    payment_url TEXT,
    
    -- Flags de status (para facilitar consultas)
    is_paid BOOLEAN DEFAULT FALSE,
    is_denied BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    is_canceled BOOLEAN DEFAULT FALSE,
    is_refunded BOOLEAN DEFAULT FALSE,
    
    -- Cliente
    customer_id TEXT,
    
    -- Evento
    event_type TEXT DEFAULT 'webhook.update',
    event_date TIMESTAMPTZ,
    
    -- Metadata
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_gateway ON payment_webhooks(external_id, gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);

-- Criar constraint única para evitar duplicatas
ALTER TABLE payment_webhooks 
DROP CONSTRAINT IF EXISTS unique_external_gateway;

ALTER TABLE payment_webhooks 
ADD CONSTRAINT unique_external_gateway 
UNIQUE (external_id, gateway);

-- Habilitar Row Level Security (RLS)
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (ajuste conforme necessário)
DROP POLICY IF EXISTS "Enable all operations for payment_webhooks" ON payment_webhooks;
CREATE POLICY "Enable all operations for payment_webhooks" ON payment_webhooks
FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;

-- Inserir dados de teste do webhook real que falhou
INSERT INTO payment_webhooks (
    external_id,
    invoice_id,
    gateway,
    status_code,
    status_name,
    status_title,
    status_description,
    status_text,
    amount,
    payment_type,
    payment_gateway,
    payment_date,
    payment_due,
    qr_code,
    is_paid,
    customer_id,
    event_type,
    event_date,
    webhook_data,
    processed_at,
    updated_at
) VALUES (
    'SHEIN_1751349759845_i6qouytzp',
    '1751350068',
    'superpay',
    5,
    'paid',
    'Pagamento Confirmado!',
    'Obrigado pela sua Compra!',
    'approved',
    27.97,
    'PIX',
    'SuperPay',
    '2025-07-01 03:03:33'::timestamptz,
    '2025-07-02 00:00:00'::timestamptz,
    '00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/f55b76c1-b79c-4a2e-b0e9-6452955c7c795204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***6304C0EE',
    true,
    '138511',
    'webhook.update',
    '2025-07-01 03:03:35'::timestamptz,
    '{"event":{"type":"webhook.update","date":"2025-07-01 03:03:35"},"invoices":{"id":"1751350068","external_id":"SHEIN_1751349759845_i6qouytzp","token":null,"date":"2025-07-01 03:02:42","status":{"code":5,"title":"Pagamento Confirmado!","description":"Obrigado pela sua Compra!","text":"approved"},"customer":138511,"prices":{"total":27.97,"discount":0,"taxs":{"others":0},"refound":null},"type":"PIX","payment":{"gateway":"SuperPay","date":"2025-07-01 03:03:33","due":"2025-07-02 00:00:00","card":null,"payId":null,"payDate":"2025-07-01 03:03:33","details":{"barcode":null,"pix_code":null,"qrcode":"00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/f55b76c1-b79c-4a2e-b0e9-6452955c7c795204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***6304C0EE","url":null}}}}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (external_id, gateway) DO UPDATE SET
    status_code = EXCLUDED.status_code,
    status_name = EXCLUDED.status_name,
    status_title = EXCLUDED.status_title,
    status_description = EXCLUDED.status_description,
    status_text = EXCLUDED.status_text,
    amount = EXCLUDED.amount,
    payment_date = EXCLUDED.payment_date,
    qr_code = EXCLUDED.qr_code,
    is_paid = EXCLUDED.is_paid,
    webhook_data = EXCLUDED.webhook_data,
    updated_at = NOW();

-- Verificar se os dados foram inseridos
SELECT 
    external_id,
    status_code,
    status_title,
    amount,
    is_paid,
    processed_at
FROM payment_webhooks 
WHERE external_id = 'SHEIN_1751349759845_i6qouytzp'
ORDER BY processed_at DESC;

-- Mostrar estatísticas da tabela
SELECT 
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE is_paid = true) as paid_webhooks,
    COUNT(*) FILTER (WHERE is_denied = true) as denied_webhooks,
    COUNT(DISTINCT gateway) as gateways_count,
    MAX(processed_at) as last_webhook
FROM payment_webhooks;

COMMIT;
