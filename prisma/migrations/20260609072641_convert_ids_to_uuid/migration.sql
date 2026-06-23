/*
  Warnings:

  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_secret` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[supplier_id,product_id]` on the table `supplier_products` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_fkey";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "customer_type" VARCHAR(50) NOT NULL DEFAULT 'Individual',
ADD COLUMN     "email" VARCHAR(100);

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "address" VARCHAR(300),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "district" VARCHAR(100),
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "next_payment_due" TIMESTAMP(3),
ADD COLUMN     "payment_status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "province" VARCHAR(100),
ADD COLUMN     "self_reported_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscription_plan" VARCHAR(50),
ADD COLUMN     "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE';

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "category" VARCHAR(100),
ADD COLUMN     "location" VARCHAR(200);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
DROP COLUMN "two_factor_secret",
ADD COLUMN     "password_reset_expiry" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "password_reset_used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "role_id" UUID,
ADD COLUMN     "totp_secret" TEXT,
ALTER COLUMN "tenant_id" DROP NOT NULL;

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "recorded_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "permissions" JSONB,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_requests" (
    "request_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "request_no" VARCHAR(50) NOT NULL,
    "supplier_id" UUID,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'Normal',
    "notes" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "items" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "entry_type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Category C',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "labourer_name" TEXT,
    "labourer_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_payments_shop_id_idx" ON "subscription_payments"("shop_id");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_created_at_idx" ON "expenses"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_supplier_id_product_id_key" ON "supplier_products"("supplier_id", "product_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("shop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
