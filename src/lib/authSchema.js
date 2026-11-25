import { query } from '@/lib/db';

let authSchemaPromise = null;

/**
 * Ensures password_reset_tokens table and users.birth_date column exist idempotently,
 * and backfills users.birth_date from patients.birth_date when missing.
 */
export async function ensureAuthSchema() {
  if (!authSchemaPromise) {
    authSchemaPromise = (async () => {
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;

        UPDATE users u
        SET birth_date = p.birth_date
        FROM patients p
        WHERE p.user_id = u.id
          AND u.birth_date IS NULL
          AND p.birth_date IS NOT NULL;

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
      `);
    })().catch((err) => {
      authSchemaPromise = null;
      throw err;
    });
  }
  return authSchemaPromise;
}
