-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "steadfastConsignmentId" INTEGER,
ADD COLUMN     "steadfastRequestedAt" TIMESTAMP(3),
ADD COLUMN     "steadfastResponse" JSONB,
ADD COLUMN     "steadfastStatus" TEXT,
ADD COLUMN     "steadfastTrackingCode" TEXT;
