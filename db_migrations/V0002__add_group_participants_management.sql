-- Add system message support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Add left_at timestamp to track when user left group
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS left_at TIMESTAMP DEFAULT NULL;