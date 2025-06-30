-- Criar tabela faturas no Supabase
CREATE TABLE IF NOT EXISTS faturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente' NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(255),
    invoice_id VARCHAR(255),
    qr_code TEXT,
    pix_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    redirect_url VARCHAR(255) DEFAULT '/obrigado',
    webhook_data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_faturas_external_id ON faturas(external_id);
CREATE INDEX IF NOT EXISTS idx_faturas_token ON faturas(token);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_expires_at ON faturas(expires_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faturas_updated_at 
    BEFORE UPDATE ON faturas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - opcional
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ajuste conforme necessário)
CREATE POLICY "Enable all operations for faturas" ON faturas
    FOR ALL USING (true);

COMMENT ON TABLE faturas IS 'Tabela para armazenar faturas PIX da SuperPayBR';
COMMENT ON COLUMN faturas.external_id IS 'ID único no formato FRETE_timestamp_random';
COMMENT ON COLUMN faturas.token IS 'Token seguro para verificação de status (15min)';
COMMENT ON COLUMN faturas.status IS 'Status: pendente, pago, recusado, cancelado, estornado, vencido';
COMMENT ON COLUMN faturas.webhook_data IS 'Dados completos recebidos do webhook SuperPayBR';
