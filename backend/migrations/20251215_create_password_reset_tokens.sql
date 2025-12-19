CREATE TABLE IF NOT EXISTS password_reset_tokens (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash VARCHAR(128) NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	used BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: ensure one active token per user (implementation enforces this)
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);
