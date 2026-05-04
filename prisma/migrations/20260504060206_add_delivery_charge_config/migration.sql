-- CreateTable
CREATE TABLE "delivery_charge_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "insideDhaka" DECIMAL(10,2) NOT NULL DEFAULT 60,
    "outsideDhaka" DECIMAL(10,2) NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_charge_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_charge_configs_key_key" ON "delivery_charge_configs"("key");
