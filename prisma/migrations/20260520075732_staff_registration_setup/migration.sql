/*
  Warnings:

  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'STORE_KEEPER', 'ACCOUNTANT', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "status" "StaffStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN     "two_factor_secret" VARCHAR(255),
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CASHIER';
