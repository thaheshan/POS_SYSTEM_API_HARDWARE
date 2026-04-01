-- CreateTable
CREATE TABLE "tenant_features" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_features_tenant_id_feature_key" ON "tenant_features"("tenant_id", "feature");
