-- Create receive_payment_link table
CREATE TABLE IF NOT EXISTS receive_payment_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    iv TEXT NOT NULL,  -- Initialization vector for AES encryption
    data TEXT NOT NULL,  -- Encrypted payment link data
    tag TEXT NOT NULL,  -- Authentication tag for AES-GCM
    type TEXT NOT NULL CHECK (type IN ('Wise', 'Alipay'))
);

-- Create unique index to ensure one link per user per type
CREATE UNIQUE INDEX IF NOT EXISTS receive_payment_link_user_type_unique 
ON receive_payment_link(user_id, type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_receive_payment_link_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receive_payment_link_updated_at
    BEFORE UPDATE ON receive_payment_link
    FOR EACH ROW
    EXECUTE FUNCTION update_receive_payment_link_updated_at();

-- Row Level Security (RLS)
ALTER TABLE receive_payment_link ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own payment links
CREATE POLICY "Users can manage their own payment links" ON receive_payment_link
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON receive_payment_link TO authenticated;
