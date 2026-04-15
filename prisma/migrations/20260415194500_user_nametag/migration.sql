-- AlterTable
ALTER TABLE "User" ADD COLUMN "nametag" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_nametag_key" ON "User"("nametag");
