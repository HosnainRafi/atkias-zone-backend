-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "buttonLink" TEXT,
ADD COLUMN     "buttonText" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "slides" JSONB,
ADD COLUMN     "subtitle" TEXT,
ALTER COLUMN "image" DROP NOT NULL;

-- AlterTable
ALTER TABLE "homepage_section_items" ADD COLUMN     "image" TEXT,
ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "refId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "products_deleted_isActive_productOrder_idx" ON "products"("deleted", "isActive", "productOrder");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");
