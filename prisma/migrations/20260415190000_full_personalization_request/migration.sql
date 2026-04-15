CREATE TABLE "FullPersonalizationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "contactEmail" TEXT NOT NULL,
    "notesFromCoach" TEXT,
    "preferredDateNotes" TEXT,
    "adminNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FullPersonalizationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FullPersonalizationRequest_userId_key" ON "FullPersonalizationRequest"("userId");
CREATE INDEX "FullPersonalizationRequest_status_requestedAt_idx" ON "FullPersonalizationRequest"("status", "requestedAt");
CREATE INDEX "FullPersonalizationRequest_scheduledFor_idx" ON "FullPersonalizationRequest"("scheduledFor");

ALTER TABLE "FullPersonalizationRequest" ADD CONSTRAINT "FullPersonalizationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
