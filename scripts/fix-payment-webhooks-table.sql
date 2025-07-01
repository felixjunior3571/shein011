-- Primeiro, vamos dropar a tabela existente e recriar corretamente
DROP TABLE IF EXISTS payment_webhooks CASCADE;

-- Criar tabela payment_webhooks com TODAS as colunas necessárias
CREATE TABLE payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,
  invoice_id TEXT,
  token TEXT,
  gateway TEXT NOT NULL DEFAULT 'superpaybr',
  
  -- Status fields
  status_code INTEGER NOT NULL DEFAULT 1,
  status_name TEXT,
  status_title TEXT,
  status_description TEXT,
  status_text TEXT,
  
  -- Payment amounts
  amount DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  taxes DECIMAL(10,2) DEFAULT 0,
  
  -- Payment details
  payment_type TEXT, -- PIX, CARD, etc
  payment_gateway TEXT,
  payment_date TIMESTAMPTZ,
  payment_due TIMESTAMPTZ,
  
  -- PIX/Payment codes
  qr_code TEXT,
  pix_code TEXT,
  barcode TEXT,
  payment_url TEXT,
  
  -- Boolean status flags
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  
  -- Customer info
  customer_id INTEGER,
  
  -- Metadata
  webhook_data JSONB,
  event_type TEXT,
  event_date TIMESTAMPTZ,
  
  -- Timestamps
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para evitar duplicatas
  UNIQUE(external_id, gateway)
);

-- Criar índices para performance
CREATE INDEX idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX idx_payment_webhooks_status_code ON payment_webhooks(status_code);
CREATE INDEX idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX idx_payment_webhooks_customer_id ON payment_webhooks(customer_id);
CREATE INDEX idx_payment_webhooks_processed_at ON payment_webhooks(processed_at DESC);
CREATE INDEX idx_payment_webhooks_event_type ON payment_webhooks(event_type);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_payment_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payment_webhooks_updated_at ON payment_webhooks;
CREATE TRIGGER update_payment_webhooks_updated_at
   BEFORE UPDATE ON payment_webhooks
   FOR EACH ROW
   EXECUTE FUNCTION update_payment_webhooks_updated_at();

-- Habilitar Realtime
ALTER TABLE payment_webhooks REPLICA IDENTITY FULL;

-- Verificar se a publicação já existe antes de adicionar
DO $$
BEGIN
   -- Remover da publicação se já existir
   BEGIN
       ALTER PUBLICATION supabase_realtime DROP TABLE payment_webhooks;
   EXCEPTION
       WHEN OTHERS THEN NULL;
   END;
   
   -- Adicionar à publicação
   ALTER PUBLICATION supabase_realtime ADD TABLE payment_webhooks;
   RAISE NOTICE '✅ Tabela payment_webhooks adicionada à publicação supabase_realtime';
END $$;

-- Verificar se a tabela foi criada com sucesso
DO $$
DECLARE
    col_count INTEGER;
    idx_count INTEGER;
BEGIN
   SELECT count(*) INTO col_count FROM information_schema.columns WHERE table_name = 'payment_webhooks';
   SELECT count(*) INTO idx_count FROM pg_indexes WHERE tablename = 'payment_webhooks';
   
   IF col_count > 0 THEN
       RAISE NOTICE '✅ Tabela payment_webhooks criada com sucesso!';
       RAISE NOTICE '📊 Estrutura: % colunas', col_count;
       RAISE NOTICE '🔍 Índices: % índices criados', idx_count;
       RAISE NOTICE '📡 Realtime: Habilitado';
       RAISE NOTICE '🔑 Colunas principais: external_id, status_code, amount, qr_code, barcode, pix_code';
   ELSE
       RAISE EXCEPTION '❌ Erro: Tabela payment_webhooks não foi criada!';
   END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE payment_webhooks IS 'Armazena todos os webhooks recebidos da SuperPayBR com estrutura completa';
COMMENT ON COLUMN payment_webhooks.external_id IS 'ID único do pagamento no sistema (SHEIN_xxxxx)';
COMMENT ON COLUMN payment_webhooks.webhook_data IS 'Dados completos do webhook em formato JSON';
COMMENT ON COLUMN payment_webhooks.qr_code IS 'Código QR PIX para pagamento';
COMMENT ON COLUMN payment_webhooks.barcode IS 'Código de barras para pagamento';
COMMENT ON COLUMN payment_webhooks.pix_code IS 'Código PIX copia e cola';
