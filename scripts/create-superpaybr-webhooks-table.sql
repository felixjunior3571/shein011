-- Criar tabela para webhooks SuperPayBR se não existir
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    payment_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at ON payment_webhooks(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_updated_at ON payment_webhooks(updated_at);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
    BEFORE UPDATE ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo para teste
INSERT INTO payment_webhooks (external_id, payment_data) 
VALUES (
    'SHEIN_TEST_SUPERPAYBR',
    '{
        "isPaid": false,
        "isDenied": false,
        "isRefunded": false,
        "isExpired": false,
        "isCanceled": false,
        "statusCode": 1,
        "statusName": "Aguardando Pagamento",
        "amount": 27.97,
        "paymentDate": null,
        "provider": "superpaybr"
    }'::jsonb
) ON CONFLICT (external_id) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_webhooks'
ORDER BY ordinal_position;
