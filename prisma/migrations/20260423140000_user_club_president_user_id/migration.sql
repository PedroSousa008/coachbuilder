-- AlterTable
ALTER TABLE "User" ADD COLUMN "clubPresidentUserId" TEXT;

-- CreateIndex
CREATE INDEX "User_clubPresidentUserId_idx" ON "User"("clubPresidentUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clubPresidentUserId_fkey" FOREIGN KEY ("clubPresidentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
