-- AlterTable
ALTER TABLE "User" ADD COLUMN "proTrialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "paymentGraceEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastPaymentFailedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "customMonthlyPriceEur" DECIMAL(10,2);
