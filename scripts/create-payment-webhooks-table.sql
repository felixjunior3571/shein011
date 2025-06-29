-- Create payment_webhooks table for SuperPayBR webhook storage
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  token TEXT,
  status_code INTEGER NOT NULL,
  status_name TEXT NOT NULL,
  status_description TEXT,
  amount DECIMAL(10,2) DEFAULT 0,
  payment_date TIMESTAMPTZ,
  is_paid BOOLEAN DEFAULT FALSE,
  is_denied BOOLEAN DEFAULT FALSE,
  is_refunded BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  is_canceled BOOLEAN DEFAULT FALSE,
  webhook_data JSONB,
  gateway TEXT DEFAULT 'superpaybr',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_invoice_id ON payment_webhooks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(status_code);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_received_at ON payment_webhooks(received_at);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhooks_unique_external_id 
ON payment_webhooks(external_id, gateway);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_payment_webhooks_updated_at 
    BEFORE UPDATE ON payment_webhooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
