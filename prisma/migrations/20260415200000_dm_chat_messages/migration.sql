-- CreateTable
CREATE TABLE "DmChatMessage" (
    "id" TEXT NOT NULL,
    "threadKey" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmChatMessage_threadKey_sentAt_idx" ON "DmChatMessage"("threadKey", "sentAt");
