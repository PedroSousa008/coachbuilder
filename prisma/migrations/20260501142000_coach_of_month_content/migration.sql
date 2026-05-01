-- CreateTable
CREATE TABLE "CoachOfMonthContent" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByUserId" TEXT,

    CONSTRAINT "CoachOfMonthContent_pkey" PRIMARY KEY ("id")
);
