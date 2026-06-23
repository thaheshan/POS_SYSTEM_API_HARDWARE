/*
  Warnings:

  - The `received_by` column on the `goods_received_notes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cashier_id` column on the `sales_invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by` column on the `sales_returns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `approved_by` column on the `sales_returns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `created_by` column on the `stock_movements` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `abbreviation` on the `units` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `manager_id` column on the `warehouses` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[tenant_id,brand_name]` on the table `brands` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,category_code]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,unit_name]` on the table `units` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `brands` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_code` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_code` to the `units` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `units` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `user_id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "goods_received_notes" DROP CONSTRAINT "goods_received_notes_received_by_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_created_by_fkey";

-- DropForeignKey
ALTER TABLE "sales_invoices" DROP CONSTRAINT "sales_invoices_cashier_id_fkey";

-- DropForeignKey
ALTER TABLE "sales_returns" DROP CONSTRAINT "sales_returns_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "sales_returns" DROP CONSTRAINT "sales_returns_created_by_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_created_by_fkey";

-- DropForeignKey
ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "branches" DROP CONSTRAINT "branches_manager_id_fkey";

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "brand_name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "category_code" TEXT NOT NULL,
ADD COLUMN     "category_level" INTEGER,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "display_order" INTEGER,
ADD COLUMN     "icon_url" TEXT,
ADD COLUMN     "parent_category_id" UUID,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "category_name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "goods_received_notes" DROP COLUMN "received_by",
ADD COLUMN     "received_by" UUID;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "created_by",
ADD COLUMN     "created_by" UUID;

-- AlterTable
ALTER TABLE "sales_invoices" DROP COLUMN "cashier_id",
ADD COLUMN     "cashier_id" UUID;

-- AlterTable
ALTER TABLE "sales_returns" DROP COLUMN "created_by",
ADD COLUMN     "created_by" UUID,
DROP COLUMN "approved_by",
ADD COLUMN     "approved_by" UUID;

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "created_by",
ADD COLUMN     "created_by" UUID;

-- AlterTable
ALTER TABLE "units" DROP COLUMN "abbreviation",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unit_code" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "unit_name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");

-- AlterTable
ALTER TABLE "warehouses" DROP COLUMN "manager_id",
ADD COLUMN     "manager_id" UUID;

-- AlterTable
ALTER TABLE "branches" ALTER COLUMN "manager_id" TYPE UUID USING "manager_id"::uuid;

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenant_id" UUID NOT NULL,
    "max_category_depth" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateIndex
CREATE INDEX "brands_tenant_id_idx" ON "brands"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_brand_name_key" ON "brands"("tenant_id", "brand_name");

-- CreateIndex
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_category_code_key" ON "categories"("tenant_id", "category_code");

-- CreateIndex
CREATE INDEX "units_tenant_id_idx" ON "units"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_tenant_id_unit_name_key" ON "units"("tenant_id", "unit_name");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
