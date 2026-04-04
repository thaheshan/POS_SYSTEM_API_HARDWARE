-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stocks_warehouse_id_product_id_key" ON "stocks"("warehouse_id", "product_id");
