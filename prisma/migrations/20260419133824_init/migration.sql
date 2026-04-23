/*
  Warnings:

  - You are about to drop the column `grandTotal` on the `sales_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `sales_invoices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoice_number]` on the table `sales_invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branch_id` to the `sales_invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cashier_id` to the `sales_invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_number` to the `sales_invoices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "sales_invoices_created_at_idx";

-- DropIndex
DROP INDEX "sales_invoices_tenant_id_idx";

-- AlterTable
ALTER TABLE "sales_invoices" DROP COLUMN "grandTotal",
DROP COLUMN "invoiceNumber",
ADD COLUMN     "branch_id" TEXT NOT NULL,
ADD COLUMN     "cashier_id" TEXT NOT NULL,
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "discount_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "grand_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "invoice_number" TEXT NOT NULL,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vat_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'completed';

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "cost_price" DOUBLE PRECISION NOT NULL,
    "line_total" DOUBLE PRECISION NOT NULL,
    "line_tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_category" TEXT NOT NULL DEFAULT 'standard_vat',

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_invoice_number_key" ON "sales_invoices"("invoice_number");

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
