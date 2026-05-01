-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
