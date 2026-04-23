-- CreateTable
CREATE TABLE "daily_tax_tracking" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "taxable_profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "input_vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_vat_payable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "income_tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_tax_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_tax_tracking_tenant_id_idx" ON "daily_tax_tracking"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_tax_tracking_date_tenant_id_key" ON "daily_tax_tracking"("date", "tenant_id");
