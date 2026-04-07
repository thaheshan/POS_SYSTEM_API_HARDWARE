-- AlterTable
ALTER TABLE "stocks" ADD COLUMN "reserved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "stocks" ADD COLUMN "available_quantity" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "held_bills" ADD COLUMN "warehouse_id" TEXT;
