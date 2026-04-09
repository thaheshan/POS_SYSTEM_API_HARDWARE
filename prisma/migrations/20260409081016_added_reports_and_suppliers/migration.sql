-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGE');

-- CreateEnum
CREATE TYPE "TaxCategory" AS ENUM ('STANDARD_VAT', 'ZERO_VAT', 'EXEMPT');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('CASH', 'CREDIT', 'CARD', 'MIXED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('COMPLETED', 'PENDING', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM ('GOOD', 'DAMAGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('CASH', 'CREDIT_NOTE', 'EXCHANGE', 'ACCOUNT_DEDUCTION');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('ISSUED', 'REDEEMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'cashier',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "account_locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "shops" (
    "shop_id" UUID NOT NULL,
    "shop_name" VARCHAR(200) NOT NULL,
    "business_registration" VARCHAR(100),

    CONSTRAINT "shops_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_name" VARCHAR(200) NOT NULL,
    "branch_code" VARCHAR(50),
    "manager_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "brands" (
    "brand_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "brand_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("brand_id")
);

-- CreateTable
CREATE TABLE "units" (
    "unit_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "unit_name" VARCHAR(50) NOT NULL,
    "abbreviation" VARCHAR(20) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "products" (
    "product_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_description" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "category_id" UUID NOT NULL,
    "brand_id" UUID,
    "unit_id" UUID,
    "purchase_price" DECIMAL(10,2),
    "selling_price" DECIMAL(10,2) NOT NULL,
    "minimum_selling_price" DECIMAL(10,2),
    "markup_percentage" DECIMAL(5,2),
    "tax_rate" DECIMAL(5,2),
    "tax_category" "TaxCategory",
    "minimum_stock_level" DECIMAL(10,2),
    "maximum_stock_level" DECIMAL(10,2),
    "reorder_quantity" DECIMAL(10,2),
    "warranty_months" INTEGER,
    "has_variants" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "variant_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_name" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "variant_attributes" JSONB,
    "purchase_price" DECIMAL(10,2),
    "selling_price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("variant_id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "image_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "display_order" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "warehouse_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "warehouse_name" VARCHAR(200) NOT NULL,
    "warehouse_code" VARCHAR(50),
    "address" TEXT,
    "capacity" DECIMAL(10,2),
    "manager_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("warehouse_id")
);

-- CreateTable
CREATE TABLE "stock" (
    "stock_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "reserved_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "available_quantity" DECIMAL(10,2),
    "damaged_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("stock_id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "movement_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "before_quantity" DECIMAL(10,2),
    "after_quantity" DECIMAL(10,2),
    "unit_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("movement_id")
);

-- CreateTable
CREATE TABLE "goods_received_notes" (
    "grn_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "purchase_order_id" UUID,
    "grn_number" VARCHAR(50) NOT NULL,
    "received_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "received_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_received_notes_pkey" PRIMARY KEY ("grn_id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "grn_item_id" UUID NOT NULL,
    "grn_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("grn_item_id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "invoice_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "invoice_time" TIME NOT NULL,
    "sale_type" "SaleType" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_percentage" DECIMAL(5,2),
    "tax_amount" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "change_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "notes" TEXT,
    "cashier_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "item_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "product_name" VARCHAR(200),
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "discount_percentage" DECIMAL(5,2),
    "tax_rate" DECIMAL(5,2),
    "tax_amount" DECIMAL(10,2),
    "line_total" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "profit" DECIMAL(10,2),
    "warehouse_id" UUID NOT NULL,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "outstanding_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_purchases" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "return_id" UUID NOT NULL,
    "ret_number" VARCHAR(50) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "customer_id" UUID,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "refund_method" "RefundMethod" NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("return_id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "return_item_id" UUID NOT NULL,
    "sales_return_id" UUID NOT NULL,
    "invoice_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "condition" "ReturnCondition" NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("return_item_id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "credit_note_id" UUID NOT NULL,
    "credit_note_number" VARCHAR(50) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sales_return_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expiry_date" DATE NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'ISSUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("credit_note_id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "report_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "supplier_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "supplier_name" VARCHAR(200) NOT NULL,
    "supplier_code" VARCHAR(50),
    "contact_person" VARCHAR(100),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "supplier_product_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "supplier_price" DECIMAL(10,2),
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("supplier_product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branch_code_key" ON "branches"("branch_code");

-- CreateIndex
CREATE INDEX "products_tenant_id_category_id_idx" ON "products"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_product_name_idx" ON "products"("tenant_id", "product_name");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_barcode_key" ON "products"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "product_variants_tenant_id_product_id_idx" ON "product_variants"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenant_id_sku_key" ON "product_variants"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenant_id_barcode_key" ON "product_variants"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_warehouse_code_key" ON "warehouses"("warehouse_code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_product_id_variant_id_warehouse_id_key" ON "stock"("product_id", "variant_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_received_notes_grn_number_key" ON "goods_received_notes"("grn_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_invoice_number_key" ON "sales_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_ret_number_key" ON "sales_returns"("ret_number");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_credit_note_number_key" ON "credit_notes"("credit_note_number");

-- CreateIndex
CREATE INDEX "generated_reports_tenant_id_report_type_start_date_idx" ON "generated_reports"("tenant_id", "report_type", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplier_code_key" ON "suppliers"("supplier_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("brand_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("unit_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_received_notes"("grn_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_return_id_fkey" FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("return_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "sales_invoice_items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_sales_return_id_fkey" FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("return_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;
