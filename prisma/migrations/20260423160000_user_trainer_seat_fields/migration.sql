-- AlterTable
ALTER TABLE "User" ADD COLUMN "trainerSeatIndex" INTEGER;
ALTER TABLE "User" ADD COLUMN "trainerSeatActive" BOOLEAN NOT NULL DEFAULT true;
