-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'manager', 'cashier', 'store_keeper', 'accountant');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('starter', 'professional', 'business', 'enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "TaxCategory" AS ENUM ('standard_vat', 'zero_vat', 'exempt');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('in', 'out', 'adjustment', 'transfer', 'return', 'damage');

-- CreateEnum
CREATE TYPE "StockAdjustmentType" AS ENUM ('physical_count', 'damage', 'expiry', 'correction');

-- CreateEnum
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('draft', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('pending', 'in_transit', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('in_stock', 'sold', 'returned', 'damaged');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('individual', 'business');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('billing', 'shipping', 'both');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('earned', 'redeemed', 'expired', 'adjusted');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('cash', 'credit', 'card', 'mixed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'partial', 'unpaid');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('completed', 'pending', 'cancelled', 'returned');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "SalesReturnStatus" AS ENUM ('pending', 'approved', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('cash', 'credit_note', 'exchange');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('sale', 'purchase', 'expense', 'other');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'bank_transfer', 'cheque', 'mobile_payment');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'sent', 'acknowledged', 'partial', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('unpaid', 'partial', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "QualityCheckStatus" AS ENUM ('passed', 'failed', 'pending');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('issued', 'used', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "ExpensePaymentMethod" AS ENUM ('cash', 'card', 'bank_transfer', 'cheque');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- CreateTable
CREATE TABLE "shops" (
    "shop_id" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL,
    "business_registration" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "tax_number" TEXT,
    "vat_registration_number" TEXT,
    "vat_registration_date" DATE,
    "subscription_plan" "SubscriptionPlan",
    "subscription_status" "SubscriptionStatus",
    "subscription_start_date" DATE,
    "subscription_end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "last_login" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "account_locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "branch_code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "manager_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "warehouse_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "warehouse_name" TEXT NOT NULL,
    "warehouse_code" TEXT,
    "address" TEXT,
    "capacity" DECIMAL(10,2),
    "manager_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("warehouse_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "description" TEXT,
    "parent_category_id" TEXT,
    "category_level" INTEGER,
    "display_order" INTEGER,
    "icon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "brands" (
    "brand_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("brand_id")
);

-- CreateTable
CREATE TABLE "units" (
    "unit_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unit_name" TEXT NOT NULL,
    "unit_code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "products" (
    "product_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_description" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "category_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "unit_id" TEXT,
    "purchase_price" DECIMAL(10,2),
    "selling_price" DECIMAL(10,2) NOT NULL,
    "minimum_selling_price" DECIMAL(10,2),
    "markup_percentage" DECIMAL(5,2),
    "tax_rate" DECIMAL(5,2),
    "tax_category" "TaxCategory" NOT NULL,
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
    "variant_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
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
    "image_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "display_order" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "stock" (
    "stock_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "warehouse_id" TEXT,
    "branch_id" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "reserved_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "available_quantity" DECIMAL(10,2),
    "damaged_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("stock_id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "movement_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "warehouse_id" TEXT,
    "movement_type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "before_quantity" DECIMAL(10,2),
    "after_quantity" DECIMAL(10,2),
    "unit_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "reference_type" TEXT,
    "reference_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("movement_id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "adjustment_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "adjustment_date" DATE NOT NULL,
    "adjustment_type" "StockAdjustmentType" NOT NULL,
    "reason" TEXT,
    "status" "StockAdjustmentStatus" NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("adjustment_id")
);

-- CreateTable
CREATE TABLE "stock_adjustment_items" (
    "adjustment_item_id" TEXT NOT NULL,
    "adjustment_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "system_quantity" DECIMAL(10,2),
    "actual_quantity" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "unit_cost" DECIMAL(10,2),
    "total_value" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "stock_adjustment_items_pkey" PRIMARY KEY ("adjustment_item_id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "transfer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "from_warehouse_id" TEXT,
    "to_warehouse_id" TEXT,
    "transfer_date" DATE NOT NULL,
    "status" "StockTransferStatus" NOT NULL,
    "notes" TEXT,
    "requested_by" TEXT,
    "approved_by" TEXT,
    "received_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("transfer_id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "transfer_item_id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity_requested" DECIMAL(10,2),
    "quantity_sent" DECIMAL(10,2),
    "quantity_received" DECIMAL(10,2),
    "unit_cost" DECIMAL(10,2),

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("transfer_item_id")
);

-- CreateTable
CREATE TABLE "bin_locations" (
    "bin_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "bin_code" TEXT NOT NULL,
    "aisle" TEXT,
    "rack" TEXT,
    "shelf" TEXT,
    "capacity" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bin_locations_pkey" PRIMARY KEY ("bin_id")
);

-- CreateTable
CREATE TABLE "serial_numbers" (
    "serial_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "serial_number" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "status" "SerialStatus" NOT NULL,
    "purchase_date" DATE,
    "sale_date" DATE,
    "warranty_expiry" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("serial_id")
);

-- CreateTable
CREATE TABLE "batch_numbers" (
    "batch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "batch_number" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "quantity" DECIMAL(10,2),
    "manufacturing_date" DATE,
    "expiry_date" DATE,
    "received_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_numbers_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "supplier_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "supplier_code" TEXT,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "tax_number" TEXT,
    "vat_number" TEXT,
    "payment_terms" TEXT,
    "credit_limit" DECIMAL(10,2),
    "credit_period_days" INTEGER,
    "bank_details" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "contact_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("contact_id")
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "supplier_product_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "supplier_sku" TEXT,
    "supplier_price" DECIMAL(10,2),
    "minimum_order_quantity" DECIMAL(10,2),
    "lead_time_days" INTEGER,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "last_purchase_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("supplier_product_id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "po_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "order_date" DATE NOT NULL,
    "expected_delivery_date" DATE,
    "actual_delivery_date" DATE,
    "status" "PurchaseOrderStatus" NOT NULL,
    "subtotal" DECIMAL(10,2),
    "tax_amount" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2),
    "shipping_cost" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2),
    "payment_terms" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("po_id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "po_item_id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity_ordered" DECIMAL(10,2) NOT NULL,
    "quantity_received" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2),
    "discount_percentage" DECIMAL(5,2),
    "line_total" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("po_item_id")
);

-- CreateTable
CREATE TABLE "goods_received_notes" (
    "grn_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "grn_number" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "received_date" DATE NOT NULL,
    "supplier_invoice_number" TEXT,
    "supplier_invoice_date" DATE,
    "delivery_note_number" TEXT,
    "total_amount" DECIMAL(10,2),
    "notes" TEXT,
    "received_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_received_notes_pkey" PRIMARY KEY ("grn_id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "grn_item_id" TEXT NOT NULL,
    "grn_id" TEXT NOT NULL,
    "po_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity_received" DECIMAL(10,2) NOT NULL,
    "quantity_accepted" DECIMAL(10,2),
    "quantity_rejected" DECIMAL(10,2),
    "unit_price" DECIMAL(10,2),
    "batch_number" TEXT,
    "expiry_date" DATE,
    "quality_check_status" "QualityCheckStatus",
    "rejection_reason" TEXT,
    "notes" TEXT,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("grn_item_id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "invoice_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "po_id" TEXT,
    "grn_id" TEXT,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "subtotal" DECIMAL(10,2),
    "tax_amount" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2),
    "status" "PurchaseInvoiceStatus" NOT NULL,
    "payment_terms" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "customer_type" "CustomerType" NOT NULL,
    "customer_name" TEXT NOT NULL,
    "company_name" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "mobile" TEXT,
    "tax_number" TEXT,
    "credit_limit" DECIMAL(10,2),
    "credit_period_days" INTEGER,
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "total_purchases" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_transactions" INTEGER NOT NULL DEFAULT 0,
    "outstanding_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "address_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "address_type" "AddressType" NOT NULL,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postal_code" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "loyalty_points" (
    "point_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "transaction_type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "balance_after" INTEGER,
    "expiry_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("point_id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "invoice_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" DATE NOT NULL,
    "invoice_time" TIME NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "customer_phone" TEXT,
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
    "status" "SalesInvoiceStatus" NOT NULL,
    "notes" TEXT,
    "cashier_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "item_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "product_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_percentage" DECIMAL(5,2),
    "tax_rate" DECIMAL(5,2),
    "tax_amount" DECIMAL(10,2),
    "line_total" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "profit" DECIMAL(10,2),
    "serial_number" TEXT,
    "batch_number" TEXT,
    "warehouse_id" TEXT,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "quotation_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quotation_number" TEXT NOT NULL,
    "quotation_date" DATE NOT NULL,
    "valid_until" DATE,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "subtotal" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2),
    "tax_amount" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2),
    "status" "QuotationStatus" NOT NULL,
    "notes" TEXT,
    "terms_conditions" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("quotation_id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "quotation_item_id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "product_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unit_price" DECIMAL(10,2),
    "discount_percentage" DECIMAL(5,2),
    "tax_rate" DECIMAL(5,2),
    "line_total" DECIMAL(10,2),

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("quotation_item_id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "return_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "return_date" DATE NOT NULL,
    "customer_id" TEXT,
    "return_type" TEXT NOT NULL,
    "return_reason" TEXT,
    "subtotal" DECIMAL(10,2),
    "tax_amount" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2),
    "refund_method" "RefundMethod" NOT NULL,
    "status" "SalesReturnStatus" NOT NULL,
    "processed_by" TEXT,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("return_id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "return_item_id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "invoice_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity" DECIMAL(10,2),
    "unit_price" DECIMAL(10,2),
    "line_total" DECIMAL(10,2),
    "condition" TEXT,
    "warehouse_id" TEXT,

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("return_item_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "payment_date" DATE NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "card_type" TEXT,
    "card_last_four" TEXT,
    "transaction_reference" TEXT,
    "bank_name" TEXT,
    "cheque_number" TEXT,
    "cheque_date" DATE,
    "notes" TEXT,
    "received_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "credit_note_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "credit_note_number" TEXT NOT NULL,
    "credit_note_date" DATE NOT NULL,
    "customer_id" TEXT NOT NULL,
    "return_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "status" "CreditNoteStatus" NOT NULL,
    "expiry_date" DATE,
    "notes" TEXT,
    "issued_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("credit_note_id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "expense_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "expense_date" DATE NOT NULL,
    "expense_category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "ExpensePaymentMethod" NOT NULL,
    "vendor_name" TEXT,
    "invoice_number" TEXT,
    "description" TEXT,
    "receipt_url" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_frequency" "RecurringFrequency",
    "recorded_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "product_sku_sequences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sku_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_tax_tracking" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_tax_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_summary" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branch_code_key" ON "branches"("branch_code");

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_warehouse_code_key" ON "warehouses"("warehouse_code");

-- CreateIndex
CREATE INDEX "warehouses_tenant_id_idx" ON "warehouses"("tenant_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_category_code_key" ON "categories"("tenant_id", "category_code");

-- CreateIndex
CREATE INDEX "brands_tenant_id_idx" ON "brands"("tenant_id");

-- CreateIndex
CREATE INDEX "units_tenant_id_idx" ON "units"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_tenant_id_unit_code_key" ON "units"("tenant_id", "unit_code");

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
CREATE INDEX "stock_tenant_id_branch_id_idx" ON "stock"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "stock_tenant_id_product_id_idx" ON "stock"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "stock_tenant_id_variant_id_idx" ON "stock"("tenant_id", "variant_id");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_product_id_idx" ON "stock_movements"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_tenant_id_idx" ON "stock_adjustments"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_adjustment_items_adjustment_id_idx" ON "stock_adjustment_items"("adjustment_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transfer_number_key" ON "stock_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfers_tenant_id_idx" ON "stock_transfers"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");

-- CreateIndex
CREATE INDEX "bin_locations_warehouse_id_idx" ON "bin_locations"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "serial_numbers_serial_number_key" ON "serial_numbers"("serial_number");

-- CreateIndex
CREATE INDEX "serial_numbers_product_id_idx" ON "serial_numbers"("product_id");

-- CreateIndex
CREATE INDEX "batch_numbers_product_id_idx" ON "batch_numbers"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplier_code_key" ON "suppliers"("supplier_code");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE INDEX "supplier_contacts_supplier_id_idx" ON "supplier_contacts"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_products_supplier_id_idx" ON "supplier_products"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_po_id_idx" ON "purchase_order_items"("po_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_received_notes_grn_number_key" ON "goods_received_notes"("grn_number");

-- CreateIndex
CREATE INDEX "goods_received_notes_tenant_id_idx" ON "goods_received_notes"("tenant_id");

-- CreateIndex
CREATE INDEX "grn_items_grn_id_idx" ON "grn_items"("grn_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_invoice_number_key" ON "purchase_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "purchase_invoices_tenant_id_idx" ON "purchase_invoices"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE INDEX "loyalty_points_customer_id_idx" ON "loyalty_points"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_invoice_number_key" ON "sales_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "sales_invoices_tenant_id_idx" ON "sales_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_invoice_items_invoice_id_idx" ON "sales_invoice_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "quotations_tenant_id_idx" ON "quotations"("tenant_id");

-- CreateIndex
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_return_number_key" ON "sales_returns"("return_number");

-- CreateIndex
CREATE INDEX "sales_returns_tenant_id_idx" ON "sales_returns"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_return_items_return_id_idx" ON "sales_return_items"("return_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_credit_note_number_key" ON "credit_notes"("credit_note_number");

-- CreateIndex
CREATE INDEX "credit_notes_tenant_id_idx" ON "credit_notes"("tenant_id");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_idx" ON "expenses"("tenant_id");

-- CreateIndex
CREATE INDEX "product_sku_sequences_tenantId_categoryId_idx" ON "product_sku_sequences"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_sequences_tenantId_categoryId_year_key" ON "product_sku_sequences"("tenantId", "categoryId", "year");

-- CreateIndex
CREATE INDEX "daily_tax_tracking_tenant_id_idx" ON "daily_tax_tracking"("tenant_id");

-- CreateIndex
CREATE INDEX "vat_summary_tenant_id_idx" ON "vat_summary"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "stock" ADD CONSTRAINT "stock_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "stock_adjustments"("adjustment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("transfer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_locations" ADD CONSTRAINT "bin_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_numbers" ADD CONSTRAINT "batch_numbers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_numbers" ADD CONSTRAINT "batch_numbers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_numbers" ADD CONSTRAINT "batch_numbers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("po_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("po_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_received_notes"("grn_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_po_item_id_fkey" FOREIGN KEY ("po_item_id") REFERENCES "purchase_order_items"("po_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("po_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_received_notes"("grn_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("quotation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "sales_returns"("return_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "sales_invoice_items"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("warehouse_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "sales_returns"("return_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tax_tracking" ADD CONSTRAINT "daily_tax_tracking_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_summary" ADD CONSTRAINT "vat_summary_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "shops"("shop_id") ON DELETE RESTRICT ON UPDATE CASCADE;
