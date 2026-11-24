import { query } from '@/lib/db';

let pharmacySchemaPromise = null;

/**
 * Ensures medicine pricing, prescription item snapshot pricing,
 * and prescription_payments table exist idempotently.
 */
export async function ensurePharmacySchema() {
  if (!pharmacySchemaPromise) {
    pharmacySchemaPromise = query(`
      ALTER TABLE medicines ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE medicines ADD COLUMN IF NOT EXISTS medicine_type VARCHAR(20) NOT NULL DEFAULT 'BIASA';
      ALTER TABLE medicines ADD COLUMN IF NOT EXISTS price NUMERIC(15, 2) NOT NULL DEFAULT 0;

      ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2);

      CREATE TABLE IF NOT EXISTS prescription_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prescription_id UUID UNIQUE NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
        payment_method VARCHAR(30) NOT NULL DEFAULT 'TRANSFER',
        status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'WAITING_CONFIRMATION', 'PAID', 'REJECTED')),
        payer_name VARCHAR(255),
        payment_reference VARCHAR(120),
        payment_notes TEXT,
        paid_at TIMESTAMP,
        confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        confirmed_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_prescription_payments_patient ON prescription_payments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_prescription_payments_status ON prescription_payments(status);
    `).catch((err) => {
      pharmacySchemaPromise = null;
      throw err;
    });
  }
  return pharmacySchemaPromise;
}
