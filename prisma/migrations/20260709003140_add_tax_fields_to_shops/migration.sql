-- Migration: add_tax_fields_to_shops
-- Adds nullable tax configuration columns to the shops table.
-- All columns are nullable or have defaults — no existing data is affected.

ALTER TABLE "shops"
  ADD COLUMN IF NOT EXISTS "vat_rate" DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tin_number" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "vat_number" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "is_ird_compliant" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tax_updated_at" TIMESTAMP(3);
