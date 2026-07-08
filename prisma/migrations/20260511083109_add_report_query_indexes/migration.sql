/*
  Warnings:

  - Added the required column `expires_at` to the `generated_reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "generated_reports" ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "sales_invoices" ADD COLUMN     "customer_id" UUID;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "advance_tax_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_tax_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advance_tax_payments_tenant_id_idx" ON "advance_tax_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_invoices_tenant_id_created_at_idx" ON "sales_invoices"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;
