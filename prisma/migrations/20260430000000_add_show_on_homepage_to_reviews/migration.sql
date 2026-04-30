-- AlterTable
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;
