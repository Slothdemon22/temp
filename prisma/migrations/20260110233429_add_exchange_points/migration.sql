-- AlterTable
ALTER TABLE "exchanges" ADD COLUMN     "exchangePointId" TEXT;

-- CreateTable
CREATE TABLE "exchange_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_points_isActive_idx" ON "exchange_points"("isActive");

-- CreateIndex
CREATE INDEX "exchange_points_city_idx" ON "exchange_points"("city");

-- CreateIndex
CREATE INDEX "exchange_points_latitude_longitude_idx" ON "exchange_points"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "exchanges_exchangePointId_idx" ON "exchanges"("exchangePointId");

-- AddForeignKey
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_exchangePointId_fkey" FOREIGN KEY ("exchangePointId") REFERENCES "exchange_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;
