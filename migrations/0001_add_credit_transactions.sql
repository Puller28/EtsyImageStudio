-- Add credit_transactions table for tracking all credit usage
CREATE TABLE IF NOT EXISTS credit_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL, -- Negative for deductions, positive for additions
    transaction_type TEXT NOT NULL, -- 'deduction', 'purchase', 'refund'
    description TEXT NOT NULL, -- 'AI Art Generation', '2x Upscaling', 'Mockup Generation', etc.
    balance_after INTEGER NOT NULL,
    project_id VARCHAR, -- Optional reference to project
    created_at TIMESTAMP DEFAULT now()
);

-- Add index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);